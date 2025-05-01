/**
 * SumoLogic MCP Server
 * 
 * This is an implementation of a Model Context Protocol (MCP) server for SumoLogic API.
 * It allows AI agents to interact with SumoLogic's API endpoints through a standardized interface.
 */

// Import required libraries
import { 
    createMcpServer, 
    tools, 
    ServerCapabilities,
    McpToolDefinition,
    McpToolParameter,
    McpRequest
  } from '@modelcontextprotocol/typescript-sdk';
  import { createStdioTransport } from '@modelcontextprotocol/typescript-sdk/transports/stdio';
  import axios from 'axios';
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
  const sumoLogicClient = axios.create({
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
  const handleApiError = (error: any): string => {
    if (error.response) {
      return `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    }
    return `Error: ${error.message}`;
  };
  
  // Define SumoLogic MCP Tools
  const sumoLogicTools: McpToolDefinition[] = [
    // Tool for checking API connectivity
    {
      name: 'check_connection',
      description: 'Check if the SumoLogic API connection is working',
      parameters: [],
      execute: async () => {
        try {
          const response = await sumoLogicClient.get('/v1/collectors');
          return {
            status: 'success',
            message: 'Connection to SumoLogic API successful'
          };
        } catch (error) {
          return {
            status: 'error',
            message: handleApiError(error)
          };
        }
      }
    },
    
    // Tool for listing collectors
    {
      name: 'list_collectors',
      description: 'List all SumoLogic collectors',
      parameters: [],
      execute: async () => {
        try {
          const response = await sumoLogicClient.get('/v1/collectors');
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for getting collector by ID
    {
      name: 'get_collector',
      description: 'Get a specific SumoLogic collector by ID',
      parameters: [
        {
          name: 'collector_id',
          description: 'The ID of the collector to retrieve',
          type: 'string',
          required: true
        }
      ],
      execute: async ({ collector_id }) => {
        try {
          const response = await sumoLogicClient.get(`/v1/collectors/${collector_id}`);
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for creating a hosted collector
    {
      name: 'create_hosted_collector',
      description: 'Create a new hosted collector in SumoLogic',
      parameters: [
        {
          name: 'name',
          description: 'Name of the collector',
          type: 'string',
          required: true
        },
        {
          name: 'description',
          description: 'Description of the collector',
          type: 'string',
          required: false
        },
        {
          name: 'category',
          description: 'Category for the collector',
          type: 'string',
          required: false
        },
        {
          name: 'fields',
          description: 'Additional fields to include with the collector',
          type: 'object',
          required: false
        }
      ],
      execute: async ({ name, description, category, fields }) => {
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
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for updating a collector
    {
      name: 'update_collector',
      description: 'Update an existing collector in SumoLogic',
      parameters: [
        {
          name: 'collector_id',
          description: 'The ID of the collector to update',
          type: 'string',
          required: true
        },
        {
          name: 'name',
          description: 'Updated name of the collector',
          type: 'string',
          required: false
        },
        {
          name: 'description',
          description: 'Updated description of the collector',
          type: 'string',
          required: false
        },
        {
          name: 'category',
          description: 'Updated category for the collector',
          type: 'string',
          required: false
        },
        {
          name: 'fields',
          description: 'Updated additional fields for the collector',
          type: 'object',
          required: false
        }
      ],
      execute: async ({ collector_id, name, description, category, fields }) => {
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
          
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for deleting a collector
    {
      name: 'delete_collector',
      description: 'Delete a SumoLogic collector by ID',
      parameters: [
        {
          name: 'collector_id',
          description: 'The ID of the collector to delete',
          type: 'string',
          required: true
        }
      ],
      execute: async ({ collector_id }) => {
        try {
          const response = await sumoLogicClient.delete(`/v1/collectors/${collector_id}`);
          return {
            status: 'success',
            message: `Collector ${collector_id} deleted successfully`
          };
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for listing sources in a collector
    {
      name: 'list_sources',
      description: 'List all sources in a specific SumoLogic collector',
      parameters: [
        {
          name: 'collector_id',
          description: 'The ID of the collector to list sources from',
          type: 'string',
          required: true
        }
      ],
      execute: async ({ collector_id }) => {
        try {
          const response = await sumoLogicClient.get(`/v1/collectors/${collector_id}/sources`);
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for getting a specific source
    {
      name: 'get_source',
      description: 'Get a specific source from a SumoLogic collector',
      parameters: [
        {
          name: 'collector_id',
          description: 'The ID of the collector containing the source',
          type: 'string',
          required: true
        },
        {
          name: 'source_id',
          description: 'The ID of the source to retrieve',
          type: 'string',
          required: true
        }
      ],
      execute: async ({ collector_id, source_id }) => {
        try {
          const response = await sumoLogicClient.get(`/v1/collectors/${collector_id}/sources/${source_id}`);
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for creating an HTTP source
    {
      name: 'create_http_source',
      description: 'Create a new HTTP source in a SumoLogic collector',
      parameters: [
        {
          name: 'collector_id',
          description: 'The ID of the collector to add the source to',
          type: 'string',
          required: true
        },
        {
          name: 'name',
          description: 'Name of the source',
          type: 'string',
          required: true
        },
        {
          name: 'description',
          description: 'Description of the source',
          type: 'string',
          required: false
        },
        {
          name: 'category',
          description: 'Category for the source',
          type: 'string',
          required: false
        },
        {
          name: 'fields',
          description: 'Additional fields to include with the source',
          type: 'object',
          required: false
        }
      ],
      execute: async ({ collector_id, name, description, category, fields }) => {
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
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for executing a search query
    {
      name: 'start_search_job',
      description: 'Start a search job in SumoLogic',
      parameters: [
        {
          name: 'query',
          description: 'The search query to execute',
          type: 'string',
          required: true
        },
        {
          name: 'from_time',
          description: 'Start time for the search (e.g. "2023-04-01T00:00:00Z" or "-15m" for relative time)',
          type: 'string',
          required: true
        },
        {
          name: 'to_time',
          description: 'End time for the search (e.g. "2023-04-01T01:00:00Z" or "now" for relative time)',
          type: 'string',
          required: true
        },
        {
          name: 'time_zone',
          description: 'Timezone for the search (e.g. "UTC")',
          type: 'string',
          required: false
        }
      ],
      execute: async ({ query, from_time, to_time, time_zone }) => {
        try {
          const searchJobData = {
            query,
            from: from_time,
            to: to_time,
            timeZone: time_zone || 'UTC'
          };
          
          const response = await sumoLogicClient.post('/v1/search/jobs', searchJobData);
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for checking search job status
    {
      name: 'check_search_job_status',
      description: 'Check the status of a search job',
      parameters: [
        {
          name: 'job_id',
          description: 'The ID of the search job to check',
          type: 'string',
          required: true
        }
      ],
      execute: async ({ job_id }) => {
        try {
          const response = await sumoLogicClient.get(`/v1/search/jobs/${job_id}`);
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for getting search job results
    {
      name: 'get_search_job_results',
      description: 'Get the results of a search job',
      parameters: [
        {
          name: 'job_id',
          description: 'The ID of the search job to get results for',
          type: 'string',
          required: true
        },
        {
          name: 'limit',
          description: 'The maximum number of results to return',
          type: 'number',
          required: false
        },
        {
          name: 'offset',
          description: 'The offset into the result set',
          type: 'number',
          required: false
        }
      ],
      execute: async ({ job_id, limit, offset }) => {
        try {
          let url = `/v1/search/jobs/${job_id}/messages`;
          const params: Record<string, string> = {};
          
          if (limit !== undefined) {
            params.limit = limit.toString();
          }
          
          if (offset !== undefined) {
            params.offset = offset.toString();
          }
          
          const response = await sumoLogicClient.get(url, { params });
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for getting monitors
    {
      name: 'list_monitors',
      description: 'List all monitors in SumoLogic',
      parameters: [],
      execute: async () => {
        try {
          const response = await sumoLogicClient.get('/v1/monitors');
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    },
    
    // Tool for getting a specific monitor
    {
      name: 'get_monitor',
      description: 'Get a specific monitor by ID',
      parameters: [
        {
          name: 'monitor_id',
          description: 'The ID of the monitor to retrieve',
          type: 'string',
          required: true
        }
      ],
      execute: async ({ monitor_id }) => {
        try {
          const response = await sumoLogicClient.get(`/v1/monitors/${monitor_id}`);
          return response.data;
        } catch (error) {
          throw new Error(handleApiError(error));
        }
      }
    }
  ];
  
  // Create MCP server
  async function main() {
    // Create the server with capabilities
    const server = createMcpServer({
      implementation: {
        name: 'sumologic',
        version: '1.0.0'
      },
      capabilities: {
        tools: {
          listChanged: true
        }
      }
    });
  
    // Register tools
    sumoLogicTools.forEach(tool => {
      server.tools.register(tool);
    });
  
    // Initialize stdio transport
    const transport = createStdioTransport();
    
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