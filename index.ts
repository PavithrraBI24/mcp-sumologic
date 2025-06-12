/**
 * SumoLogic MCP Server
 * 
 * This is an implementation of a Model Context Protocol (MCP) server for SumoLogic API.
 * It allows AI agents to interact with SumoLogic's API endpoints through a standardized interface.
 */

// Import required libraries
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios, { AxiosInstance, AxiosError } from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define SumoLogic API constants
const SUMOLOGIC_ACCESS_ID = process.env.SUMOLOGIC_ACCESS_ID || '';
const SUMOLOGIC_ACCESS_KEY = process.env.SUMOLOGIC_ACCESS_KEY || '';
const SUMOLOGIC_API_ENDPOINT = process.env.SUMOLOGIC_API_ENDPOINT || 'https://api.sumologic.com/api';

// Check if credentials are provided
if (!SUMOLOGIC_ACCESS_ID || !SUMOLOGIC_ACCESS_KEY) {
  console.error('SumoLogic API credentials not provided. Please set SUMOLOGIC_ACCESS_ID and SUMOLOGIC_ACCESS_KEY environment variables.');
  process.exit(1);
}

// Create axios instance with authentication
const sumoLogicClient: AxiosInstance = axios.create({
  withCredentials: true,
  baseURL: SUMOLOGIC_API_ENDPOINT,
  auth: {
    username: SUMOLOGIC_ACCESS_ID,
    password: SUMOLOGIC_ACCESS_KEY
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Helper function to handle API errors
const handleApiError = (error: unknown): string => {
  if (error instanceof AxiosError && error.response) {
    return `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
  }
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return 'Unknown error occurred';
};

// Create MCP server
const server = new McpServer({
  name: 'sumologic',
  version: '1.0.0'
});

// Tool for checking API connectivity
server.tool(
  'check_connection',
  'Check if the SumoLogic API connection is working',
  {},
  async () => {
    try {
      await sumoLogicClient.get('/v1/collectors');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            message: 'Connection to SumoLogic API successful'
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            message: handleApiError(error)
          })
        }]
      };
    }
  }
);

// Tool for listing collectors
server.tool(
  'list_collectors',
  'List all SumoLogic collectors',
  {},
  async () => {
    try {
      const response = await sumoLogicClient.get('/v1/collectors');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for getting collector by ID
server.tool(
  'get_collector',
  'Get a specific SumoLogic collector by ID',
  {
    collector_id: z.string().describe('The ID of the collector to retrieve')
  },
  async ({ collector_id }) => {
    try {
      const response = await sumoLogicClient.get(`/v1/collectors/${collector_id}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for creating a hosted collector
server.tool(
  'create_hosted_collector',
  'Create a new hosted collector in SumoLogic',
  {
    name: z.string().describe('Name of the collector'),
    description: z.string().optional().describe('Description of the collector'),
    category: z.string().optional().describe('Category for the collector'),
    fields: z.record(z.string()).optional().describe('Additional fields to include with the collector')
  },
  async ({ name, description, category, fields }) => {
    try {
      const collectorData = {
        collector: {
          collectorType: 'Hosted',
          name,
          description,
          category,
          fields
        }
      };
      
      const response = await sumoLogicClient.post('/v1/collectors', collectorData);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for updating a collector
server.tool(
  'update_collector',
  'Update an existing collector in SumoLogic',
  {
    collector_id: z.string().describe('The ID of the collector to update'),
    name: z.string().optional().describe('Updated name of the collector'),
    description: z.string().optional().describe('Updated description of the collector'),
    category: z.string().optional().describe('Updated category for the collector'),
    fields: z.record(z.string()).optional().describe('Updated additional fields for the collector')
  },
  async ({ collector_id, name, description, category, fields }) => {
    try {
      // First, get the current collector to ensure we have the latest ETag
      const getResponse = await sumoLogicClient.get(`/v1/collectors/${collector_id}`);
      const currentCollector = getResponse.data.collector;
      const etag = getResponse.headers.etag;
      
      // Prepare updated data
      const collectorData = {
        collector: {
          ...currentCollector,
          name: name || currentCollector.name,
          description: description !== undefined ? description : currentCollector.description,
          category: category || currentCollector.category,
          fields: fields || currentCollector.fields
        }
      };
      
      // Update with ETag header for optimistic locking
      const response = await sumoLogicClient.put(`/v1/collectors/${collector_id}`, collectorData, {
        headers: {
          'If-Match': etag
        }
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for deleting a collector
server.tool(
  'delete_collector',
  'Delete a SumoLogic collector by ID',
  {
    collector_id: z.string().describe('The ID of the collector to delete')
  },
  async ({ collector_id }) => {
    try {
      await sumoLogicClient.delete(`/v1/collectors/${collector_id}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            message: `Collector ${collector_id} deleted successfully`
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for listing sources in a collector
server.tool(
  'list_sources',
  'List all sources in a specific SumoLogic collector',
  {
    collector_id: z.string().describe('The ID of the collector to list sources from')
  },
  async ({ collector_id }) => {
    try {
      const response = await sumoLogicClient.get(`/v1/collectors/${collector_id}/sources`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for getting a specific source
server.tool(
  'get_source',
  'Get a specific source from a SumoLogic collector',
  {
    collector_id: z.string().describe('The ID of the collector containing the source'),
    source_id: z.string().describe('The ID of the source to retrieve')
  },
  async ({ collector_id, source_id }) => {
    try {
      const response = await sumoLogicClient.get(`/v1/collectors/${collector_id}/sources/${source_id}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for creating an HTTP source
server.tool(
  'create_http_source',
  'Create a new HTTP source in a SumoLogic collector',
  {
    collector_id: z.string().describe('The ID of the collector to add the source to'),
    name: z.string().describe('Name of the source'),
    description: z.string().optional().describe('Description of the source'),
    category: z.string().optional().describe('Category for the source'),
    fields: z.record(z.string()).optional().describe('Additional fields to include with the source')
  },
  async ({ collector_id, name, description, category, fields }) => {
    try {
      const sourceData = {
        source: {
          sourceType: 'HTTP',
          name,
          description,
          category,
          fields,
          messagePerRequest: false
        }
      };
      
      const response = await sumoLogicClient.post(`/v1/collectors/${collector_id}/sources`, sourceData);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for executing a search query
server.tool(
  'start_search_job',
  'Start a search job in SumoLogic',
  {
    query: z.string().describe('The search query to execute'),
    from_time: z.string().describe('Start time for the search (e.g. "2023-04-01T00:00:00Z" or "-15m" for relative time)'),
    to_time: z.string().describe('End time for the search (e.g. "2023-04-01T01:00:00Z" or "now" for relative time)'),
    time_zone: z.string().optional().describe('Timezone for the search (e.g. "UTC")')
  },
  async ({ query, from_time, to_time, time_zone }) => {
    try {
      const searchJobData = {
        query,
        from: from_time,
        to: to_time,
        timeZone: time_zone || 'UTC'
      };
      
      const response = await sumoLogicClient.post('/v1/search/jobs', searchJobData);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for checking search job status
server.tool(
  'check_search_job_status',
  'Check the status of a search job',
  {
    job_id: z.string().describe('The ID of the search job to check')
  },
  async ({ job_id }) => {
    try {
      const response = await sumoLogicClient.get(`/v1/search/jobs/${job_id}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for getting search job results
server.tool(
  'get_search_job_results',
  'Get the results of a search job',
  {
    job_id: z.string().describe('The ID of the search job to get results for'),
    limit: z.number().optional().describe('The maximum number of results to return'),
    offset: z.number().optional().describe('The offset into the result set')
  },
  async ({ job_id, limit, offset }) => {
    try {
      const url = `/v1/search/jobs/${job_id}/messages`;
      const params: Record<string, string> = {};
      
      if (limit !== undefined) {
        params.limit = limit.toString();
      }
      
      if (offset !== undefined) {
        params.offset = offset.toString();
      }
      
      const response = await sumoLogicClient.get(url, { params });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for getting monitors
server.tool(
  'list_monitors',
  'List all monitors in SumoLogic',
  {},
  async () => {
    try {
      const response = await sumoLogicClient.get('/v1/monitors');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Tool for getting a specific monitor
server.tool(
  'get_monitor',
  'Get a specific monitor by ID',
  {
    monitor_id: z.string().describe('The ID of the monitor to retrieve')
  },
  async ({ monitor_id }) => {
    try {
      const response = await sumoLogicClient.get(`/v1/monitors/${monitor_id}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: handleApiError(error)
        }],
        isError: true
      };
    }
  }
);

// Main function to start the server
async function main() {
  // Initialize stdio transport
  const transport = new StdioServerTransport();
  
  console.error('SumoLogic MCP Server starting...');
  
  try {
    // Connect the server to the transport
    await server.connect(transport);
    console.error('SumoLogic MCP Server connected and ready');
  } catch (error) {
    console.error('Error connecting MCP server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch(error => {
  console.error('Fatal error in SumoLogic MCP Server:', error);
  process.exit(1);
});