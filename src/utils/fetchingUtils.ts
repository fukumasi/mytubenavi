// src/utils/fetchingUtils.ts

interface OperationLogEntry {
  operation: string;
  startTime?: string;
  endTime?: string;
  status: 'started' | 'completed' | 'failed';
  details?: any;
}

interface FetchState {
  isFetching: boolean;
  operation: string | null;
  startTime: string | null;
}

interface DebugInfo {
  fetchState?: FetchState;
  operationLog?: OperationLogEntry[];
}

// --- フェッチ開始関数 ---
export const startFetching = (
  isFetchingRef: React.MutableRefObject<boolean>,
  setDebugInfo?: (updater: (prev: DebugInfo | null) => DebugInfo | null) => void,
  operationName?: string
): boolean => {
  if (isFetchingRef.current) {
    console.warn(`Fetching already in progress, skipping: ${operationName}`);
    return false;
  }

  isFetchingRef.current = true;

  if (process.env.NODE_ENV === 'development' && setDebugInfo && operationName) {
    setDebugInfo(prev => ({
      ...prev,
      fetchState: {
        isFetching: true,
        operation: operationName,
        startTime: new Date().toISOString()
      },
      operationLog: [
        ...(prev?.operationLog || []),
        {
          operation: operationName,
          startTime: new Date().toISOString(),
          status: 'started'
        }
      ]
    }));
  }
  return true;
};

// --- フェッチ終了関数 ---
export const endFetching = (
  isFetchingRef: React.MutableRefObject<boolean>,
  setDebugInfo?: (updater: (prev: DebugInfo | null) => DebugInfo | null) => void,
  operationName?: string,
  success: boolean = true,
  details?: any
) => {
  isFetchingRef.current = false;

  if (process.env.NODE_ENV === 'development' && setDebugInfo && operationName) {
    const endTime = new Date().toISOString();
    const status = success ? 'completed' : 'failed';

    setDebugInfo(prev => {
      if (!prev) return null;
      return {
        ...prev,
        fetchState: {
          isFetching: false,
          operation: null,
          startTime: null
        },
        operationLog: (prev.operationLog || []).map(log =>
          log.operation === operationName && log.status === 'started'
            ? { ...log, endTime, status, details }
            : log
        )
      };
    });
  }
};
