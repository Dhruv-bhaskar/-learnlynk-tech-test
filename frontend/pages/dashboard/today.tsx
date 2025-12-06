

import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

// Setup QueryClient
const queryClient = new QueryClient();

// Define Task type
interface Task {
  id: string;
  type: string;
  title: string;
  application_id: string;
  due_at: string;
  status: string;
}

// Fetch function
const fetchTodayTasks = async (): Promise<Task[]> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const { data, error } = await supabase
    .from('tasks')
    .select('id, type, title, application_id, due_at, status')
    .gte('due_at', startOfDay.toISOString())
    .lte('due_at', endOfDay.toISOString())
    .neq('status', 'completed')
    .order('due_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Task[];
};

// Mutation function
const markTaskComplete = async (taskId: string) => {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'completed' })
    .eq('id', taskId);

  if (error) {
    throw new Error(error.message);
  }
};

// Core component
function TodayTasksContent() {
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks, isLoading, isError, error } = useQuery({
    queryKey: ['todayTasks'],
    queryFn: fetchTodayTasks,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mark complete mutation
  const completeMutation = useMutation({
    mutationFn: markTaskComplete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayTasks'] });
    },
    onError: (err) => {
      alert(`Failed to complete task: ${err.message}`);
    },
  });

  const handleMarkComplete = (taskId: string) => {
    if (!completeMutation.isPending) {
      completeMutation.mutate(taskId);
    }
  };

  // Helper functions
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'call':
        return 'bg-blue-100 text-blue-800';
      case 'email':
        return 'bg-green-100 text-green-800';
      case 'review':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800">
              Error: {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="items-center min-h-screen bg-gray-50 py-8">
      <div className="mt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tasks Due Today</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your tasks scheduled for today
          </p>
        </div>

        {/* No tasks */}
        {tasks?.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              No tasks due today
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You're all caught up! Check back tomorrow.
            </p>
          </div>
        ) : (
          <>
            {/* Tasks Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Application ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks?.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTaskTypeColor(
                            task.type
                          )}`}
                        >
                          {task.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {task.title || 'Untitled Task'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">
                          {task.application_id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatTime(task.due_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            task.status
                          )}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleMarkComplete(task.id)}
                          disabled={
                            completeMutation.isPending ||
                            task.status === 'completed'
                          }
                          className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                            completeMutation.isPending
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : task.status === 'completed'
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                          }`}
                        >
                          {completeMutation.isPending &&
                          completeMutation.variables === task.id ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Updating...
                            </>
                          ) : task.status === 'completed' ? (
                            'Completed'
                          ) : (
                            'Mark Complete'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <p>
                Showing <span className="font-medium">{tasks?.length}</span>{' '}
                task{tasks?.length !== 1 ? 's' : ''} due today
              </p>
              <button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ['todayTasks'] })
                }
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Wrapper with QueryClientProvider
export default function TodayPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <TodayTasksContent />
    </QueryClientProvider>
  );
}