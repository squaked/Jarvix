import EventKit
import Foundation

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
