# SumoLogic MCP Server

A Model Context Protocol (MCP) server for the SumoLogic API that can be deployed locally as a Docker container. This server allows AI agents to leverage MCP to interact with SumoLogic's API methods.

## Features

- Packaged as a Docker container for easy deployment
- Implements the [Model Context Protocol](https://modelcontextprotocol.io/introduction)
- Provides tools for interacting with SumoLogic API endpoints
- Authentication via SumoLogic API keys
- Support for Collectors, Sources, Search Jobs, and Monitors management

## Prerequisites

- Docker
- SumoLogic account with API access
- Access ID and Access Key for the SumoLogic API

## Quick Start

### Using Docker Hub Image (Recommended)

```bash
docker run -i --rm \
  -e SUMOLOGIC_ACCESS_ID=your_access_id \
  -e SUMOLOGIC_ACCESS_KEY=your_access_key \
  -e SUMOLOGIC_API_ENDPOINT=https://api.us2.sumologic.com/api \
  sumologic-mcp-server
```

### Building Locally

1. Clone this repository:

```bash
git clone https://github.com/greyaperez/mcp-sumologic.git
cd mcp-sumologic
```

2. Build the Docker image:

```bash
docker build -t sumologic-mcp-server .
```

3. Run the container:

```bash
docker run -i --rm \
  -e SUMOLOGIC_ACCESS_ID=your_access_id \
  -e SUMOLOGIC_ACCESS_KEY=your_access_key \
  -e SUMOLOGIC_API_ENDPOINT=https://api.us2.sumologic.com/api \
  sumologic-mcp-server
```

## Environment Variables

- `SUMOLOGIC_ACCESS_ID`: Your SumoLogic Access ID
- `SUMOLOGIC_ACCESS_KEY`: Your SumoLogic Access Key
- `SUMOLOGIC_API_ENDPOINT`: The SumoLogic API endpoint for your deployment (e.g., https://api.us2.sumologic.com/api)

## Integration with MCP Clients

### VS Code

To use this MCP server with VS Code, add the following configuration to your `.vscode/mcp.json` file:

```json
{
  "servers": {
    "sumologic": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "SUMOLOGIC_ACCESS_ID",
        "-e",
        "SUMOLOGIC_ACCESS_KEY",
        "-e",
        "SUMOLOGIC_API_ENDPOINT",
        "sumologic-mcp-server"
      ],
      "env": {
        "SUMOLOGIC_ACCESS_ID": "your_access_id",
        "SUMOLOGIC_ACCESS_KEY": "your_access_key",
        "SUMOLOGIC_API_ENDPOINT": "https://api.us2.sumologic.com/api"
      }
    }
  }
}
```

### Claude Desktop

To use this MCP server with Claude Desktop, add the following configuration to your `~/.config/Claude/claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "sumologic": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "SUMOLOGIC_ACCESS_ID",
        "-e",
        "SUMOLOGIC_ACCESS_KEY",
        "-e",
        "SUMOLOGIC_API_ENDPOINT",
        "sumologic-mcp-server"
      ],
      "env": {
        "SUMOLOGIC_ACCESS_ID": "your_access_id",
        "SUMOLOGIC_ACCESS_KEY": "your_access_key",
        "SUMOLOGIC_API_ENDPOINT": "https://api.us2.sumologic.com/api"
      }
    }
  }
}
```

## Available Tools

The SumoLogic MCP Server provides the following tools:

- `check_connection`: Check if the SumoLogic API connection is working
- `list_collectors`: List all SumoLogic collectors
- `get_collector`: Get a specific SumoLogic collector by ID
- `create_hosted_collector`: Create a new hosted collector in SumoLogic
- `update_collector`: Update an existing collector in SumoLogic
- `delete_collector`: Delete a SumoLogic collector by ID
- `list_sources`: List all sources in a specific SumoLogic collector
- `get_source`: Get a specific source from a SumoLogic collector
- `create_http_source`: Create a new HTTP source in a SumoLogic collector
- `start_search_job`: Start a search job in SumoLogic
- `check_search_job_status`: Check the status of a search job
- `get_search_job_results`: Get the results of a search job
- `list_monitors`: List all monitors in SumoLogic
- `get_monitor`: Get a specific monitor by ID

## Development

### Local Development Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with your SumoLogic credentials:

```
SUMOLOGIC_ACCESS_ID=your_access_id
SUMOLOGIC_ACCESS_KEY=your_access_key
SUMOLOGIC_API_ENDPOINT=https://api.us2.sumologic.com/api
```

3. Build the TypeScript code:

```bash
npm run build
```

4. Run the server locally:

```bash
npm start
```

### Adding New Tools

To add new tools for additional SumoLogic API endpoints:

1. Add a new tool definition to the `sumoLogicTools` array in `src/index.ts`
2. Define parameters, validation, and execution logic
3. Rebuild and test the server

## License

GPL

## Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [SumoLogic API Documentation](https://help.sumologic.com/docs/api/)
- [SumoLogic API Endpoints](https://help.sumologic.com/docs/reuse/api-endpoints/)