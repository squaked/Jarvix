import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import type { McpConnector } from "./types";

/**
 * ConnectorManager manages the lifecycle of MCP clients (Connectors).
 * It caches active connections to avoid leaking processes and to ensure
 * fast tool discovery during chat sessions.
 */
class ConnectorManager {
  private clients = new Map<string, any>();

  /**
   * Returns a merged set of tools from all enabled connectors.
   * Connectors are initialized lazily upon first use.
   */
  async getToolsForConnectors(connectors: McpConnector[]) {
    const activeConnectors = connectors.filter((c) => c.enabled);
    const results = await Promise.all(
      activeConnectors.map(async (connector) => {
        try {
          const client = await this.getOrInitClient(connector);
          const tools = await client.tools();
          
          // Prefix tools to avoid name collisions between different connectors
          // e.g. "gmail_search", "slack_search"
          const prefix = connector.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
          
          const prefixedTools: Record<string, any> = {};
          for (const [name, tool] of Object.entries(tools)) {
            const prefixedName = `${prefix}_${name}`;
            prefixedTools[prefixedName] = tool;
          }
          
          return prefixedTools;
        } catch (e) {
          console.error(`[ConnectorManager] Error fetching tools for "${connector.name}":`, e);
          return {};
        }
      })
    );

    // Merge all tool maps into one
    return results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
  }

  /**
   * Closes all active connections. Useful for cleanup or testing.
   */
  async shutdown() {
    // Note: The AI SDK MCP client doesn't currently expose a direct 'close' method
    // in its high-level API, but the underlying transport might need cleanup.
    // For now, we clear the map.
    this.clients.clear();
  }

  private async getOrInitClient(connector: McpConnector) {
    const configHash = JSON.stringify({
      type: connector.type,
      command: connector.command,
      args: connector.args,
      url: connector.url,
      env: connector.env,
    });

    const existing = this.clients.get(connector.id);
    if (existing && existing.configHash === configHash) {
      return existing.client;
    }

    // If config changed or doesn't exist, (re)initialize
    const client = await this.createClient(connector);
    this.clients.set(connector.id, { client, configHash });
    return client;
  }

  private async createClient(connector: McpConnector) {
    console.log(`[ConnectorManager] Initializing connector: ${connector.name} (${connector.type})`);
    
    if (connector.type === "stdio") {
      if (!connector.command) {
        throw new Error(`Connector "${connector.name}" is missing a command.`);
      }
      const env: Record<string, string> = {};
      for (const [k, v] of Object.entries(process.env)) {
        if (v !== undefined) env[k] = v;
      }
      Object.assign(env, connector.env || {});
      return createMCPClient({
        transport: new Experimental_StdioMCPTransport({
          command: connector.command,
          args: connector.args || [],
          env,
        }),
      });
    }
    if (!connector.url) {
      throw new Error(`Connector "${connector.name}" is missing a URL.`);
    }
    return createMCPClient({
      transport: {
        type: "sse",
        url: connector.url,
      },
    });
  }
}

// Persist the manager instance across hot reloads in development
const globalForConnectorManager = global as unknown as {
  connectorManager: ConnectorManager | undefined;
};

export const connectorManager =
  globalForConnectorManager.connectorManager ?? new ConnectorManager();

if (process.env.NODE_ENV !== "production") {
  globalForConnectorManager.connectorManager = connectorManager;
}
