import Darwin
import EventKit
import Foundation

// MARK: - TCC responsibility disclaim
// Node spawns this helper via posix_spawn; TCC then attributes calendar access
// to the parent (applet/Terminal/Cursor), not this bundle. Re-exec once with
// responsibility_spawnattrs_setdisclaim (POSIX_SPAWN_SETEXEC, macOS 10.14+)
// so this process is its own responsible app for Privacy → Calendars.

@_silgen_name("responsibility_spawnattrs_setdisclaim")
private func responsibility_spawnattrs_setdisclaim(
    _ attrs: UnsafeMutablePointer<posix_spawnattr_t?>,
    _ disclaim: Int32
) -> Int32

private let kDisclaimSentinelEnv = "JARVIX_HELPER_DISCLAIMED"

private func disclaimResponsibilityIfNeeded() {
    // Sentinel prevents an infinite re-exec loop.
    if ProcessInfo.processInfo.environment[kDisclaimSentinelEnv] != nil { return }

    var attr: posix_spawnattr_t?
    guard posix_spawnattr_init(&attr) == 0 else { return }
    defer { posix_spawnattr_destroy(&attr) }

    var flags: Int16 = Int16(POSIX_SPAWN_SETEXEC)

    // Reset signal mask and handlers, matching the Qt/Apple template.
    var noSignals = sigset_t()
    sigemptyset(&noSignals)
    if posix_spawnattr_setsigmask(&attr, &noSignals) == 0 {
        flags |= Int16(POSIX_SPAWN_SETSIGMASK)
    }
    var allSignals = sigset_t()
    sigfillset(&allSignals)
    if posix_spawnattr_setsigdefault(&attr, &allSignals) == 0 {
        flags |= Int16(POSIX_SPAWN_SETSIGDEF)
    }
    posix_spawnattr_setflags(&attr, flags)

    // Disclaim parent responsibility — child (= us after exec) becomes its own
    // responsible process for TCC.
    if responsibility_spawnattrs_setdisclaim(&attr, 1) != 0 { return }

    // Build argv from the current process.
    let argv = CommandLine.arguments
    let cArgv: [UnsafeMutablePointer<CChar>?] =
        argv.map { strdup($0) } + [nil]
    defer { for p in cArgv where p != nil { free(p) } }

    // Build envp from the current env + the sentinel.
    var env = ProcessInfo.processInfo.environment
    env[kDisclaimSentinelEnv] = "1"
    let envStrings = env.map { "\($0)=\($1)" }
    let cEnv: [UnsafeMutablePointer<CChar>?] =
        envStrings.map { strdup($0) } + [nil]
    defer { for p in cEnv where p != nil { free(p) } }

    // POSIX_SPAWN_SETEXEC means this never returns on success — same PID,
    // stdin/stdout/stderr inherited, new responsibility identity.
    var pid: pid_t = 0
    _ = cArgv.withUnsafeBufferPointer { argvBuf in
        cEnv.withUnsafeBufferPointer { envBuf in
            posix_spawnp(
                &pid,
                argv[0],
                nil,
                &attr,
                argvBuf.baseAddress.map { UnsafeMutablePointer(mutating: $0) },
                envBuf.baseAddress.map { UnsafeMutablePointer(mutating: $0) }
            )
        }
    }
    // If we reach here, posix_spawn with SETEXEC failed — proceed without
    // disclaim. TCC will likely deny but at least we don't crash.
}

disclaimResponsibilityIfNeeded()

let store = EKEventStore()

func printJson(_ obj: [String: Any]) {
    let data = try! JSONSerialization.data(withJSONObject: obj, options: [])
    FileHandle.standardOutput.write(data)
    print("", terminator: "\n")
}

func parseIso(_ s: String) -> Date? {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = f.date(from: s) { return d }
    f.formatOptions = [.withInternetDateTime]
    return f.date(from: s)
}

func formatIso(_ d: Date) -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.string(from: d)
}

func authString(_ entity: EKEntityType) -> String {
    switch EKEventStore.authorizationStatus(for: entity) {
    case .notDetermined: return "notDetermined"
    case .restricted: return "restricted"
    case .denied: return "denied"
    case .authorized: return "authorized"
    case .writeOnly: return "writeOnly"
    case .fullAccess: return "fullAccess"
    @unknown default: return "unknown"
    }
}

func waitRequestCalendar() -> Bool {
    let s = DispatchSemaphore(value: 0)
    var g = false
    if #available(macOS 14.0, *) {
        store.requestFullAccessToEvents { granted, _ in
            g = granted
            s.signal()
        }
    } else {
        store.requestAccess(to: .event) { granted, _ in
            g = granted
            s.signal()
        }
    }
    s.wait()
    return g
}

func serializeEvent(_ ev: EKEvent) -> [String: Any] {
    [
        "title": ev.title ?? "",
        "start": formatIso(ev.startDate),
        "end": formatIso(ev.endDate),
        "calendar": ev.calendar?.title ?? "",
    ]
}

func defaultEventCalendar() -> EKCalendar? {
    if let c = store.defaultCalendarForNewEvents { return c }
    let cals = store.calendars(for: .event)
    return cals.first(where: { $0.allowsContentModifications }) ?? cals.first
}

guard let input = try? FileHandle.standardInput.readToEnd(),
      let json = try? JSONSerialization.jsonObject(with: input) as? [String: Any],
      let op = json["op"] as? String
else {
    printJson(["ok": false, "error": "invalid JSON stdin"])
    exit(1)
}

switch op {
case "authStatus":
    printJson(["ok": true, "status": authString(.event)])

case "requestAccess":
    let granted = waitRequestCalendar()
    printJson([
        "ok": true,
        "granted": granted,
        "status": authString(.event),
    ])

case "eventsInRange":
    guard let startStr = json["start"] as? String, let endStr = json["end"] as? String,
          let start = parseIso(startStr), let end = parseIso(endStr)
    else {
        printJson(["ok": false, "error": "eventsInRange needs start,end ISO strings"])
        exit(0)
    }
    let pred = store.predicateForEvents(withStart: start, end: end, calendars: nil)
    let evs = store.events(matching: pred)
    let out = evs.map { serializeEvent($0) }
    printJson(["ok": true, "events": out])

case "saveEvent":
    guard let title = json["title"] as? String,
          let startStr = json["startISO"] as? String,
          let endStr = json["endISO"] as? String,
          let startDate = parseIso(startStr),
          let endDate = parseIso(endStr)
    else {
        printJson(["ok": false, "error": "saveEvent needs title, startISO, endISO"])
        exit(0)
    }
    guard let cal = defaultEventCalendar() else {
        printJson(["ok": false, "error": "No calendar available for new events"])
        exit(0)
    }
    let ev = EKEvent(eventStore: store)
    ev.calendar = cal
    ev.title = title
    ev.notes = json["notes"] as? String
    ev.startDate = startDate
    ev.endDate = endDate
    do {
        try store.save(ev, span: .thisEvent, commit: true)
        guard let id = ev.eventIdentifier else {
            printJson(["ok": false, "error": "save succeeded but no event id"])
            exit(0)
        }
        printJson(["ok": true, "id": id])
    } catch {
        printJson(["ok": false, "error": error.localizedDescription])
        exit(0)
    }

default:
    printJson(["ok": false, "error": "unknown op \(op)"])
    exit(1)
}
