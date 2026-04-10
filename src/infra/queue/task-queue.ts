export interface TaskQueue {
  enqueue(task: () => Promise<void>): Promise<void>;
  onIdle(): Promise<void>;
}

export class ConcurrentTaskQueue implements TaskQueue {
  private running = 0;
  private readonly waiting: Array<() => Promise<void>> = [];
  private idleResolvers: Array<() => void> = [];

  constructor(private readonly concurrency: number) {
    if (concurrency < 1) throw new Error('concurrency must be >= 1');
  }

  async enqueue(task: () => Promise<void>): Promise<void> {
    this.waiting.push(task);
    this.tryRun();
  }

  async onIdle(): Promise<void> {
    if (this.running === 0 && this.waiting.length === 0) return;
    await new Promise<void>((resolve) => this.idleResolvers.push(resolve));
  }

  private tryRun(): void {
    while (this.running < this.concurrency && this.waiting.length > 0) {
      const task = this.waiting.shift();
      if (!task) return;

      this.running += 1;
      task()
        .catch(() => undefined)
        .finally(() => {
          this.running -= 1;
          this.tryRun();
          if (this.running === 0 && this.waiting.length === 0) {
            this.idleResolvers.splice(0).forEach((resolve) => resolve());
          }
        });
    }
  }
}
