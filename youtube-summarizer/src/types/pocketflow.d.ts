declare module 'pocketflow' {
  type NonIterableObject = Partial<Record<string, unknown>> & { [Symbol.iterator]?: never };
  type Action = string;

  export class BaseNode<S = unknown, P extends NonIterableObject = NonIterableObject> {
    protected _params: P;
    protected _successors: Map<Action, BaseNode>;
    
    async prep(shared: S): Promise<unknown>;
    async exec(prepRes: unknown): Promise<unknown>;
    async post(shared: S, prepRes: unknown, execRes: unknown): Promise<Action | undefined>;
    async run(shared: S): Promise<Action | undefined>;
    
    setParams(params: P): this;
    next<T extends BaseNode<S, P>>(node: T): T;
    on(action: Action, node: BaseNode): this;
    getNextNode(action?: Action): BaseNode | undefined;
    clone(): this;
  }

  export class Node<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode<S, P> {
    maxRetries: number;
    wait: number;
    currentRetry: number;
    
    constructor(maxRetries?: number, wait?: number);
    
    async execFallback(prepRes: unknown, error: Error): Promise<unknown>;
  }

  export class BatchNode<S = unknown, P extends NonIterableObject = NonIterableObject> extends Node<S, P> {}

  export class ParallelBatchNode<S = unknown, P extends NonIterableObject = NonIterableObject> extends Node<S, P> {}

  export class Flow<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode<S, P> {
    start: BaseNode;
    
    constructor(start: BaseNode);
  }

  export class BatchFlow<S = unknown, P extends NonIterableObject = NonIterableObject, NP extends NonIterableObject[] = NonIterableObject[]> extends Flow<S, P> {}

  export class ParallelBatchFlow<S = unknown, P extends NonIterableObject = NonIterableObject, NP extends NonIterableObject[] = NonIterableObject[]> extends BatchFlow<S, P, NP> {}
} 