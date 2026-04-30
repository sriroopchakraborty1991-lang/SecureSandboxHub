import Docker from 'dockerode';
import {PassThrough} from 'node:stream';
import type {Db} from '../db/db';
import type {PolicyRules} from '../db/policies';
import {appendEvent, type SandboxEventType} from '../db/events';
import {publishEvent} from '../events/bus';

export class SandboxRunner {
  private docker: Docker;
  private db: Db;

  constructor(input: {db: Db; dockerSocket: string}) {
    this.db = input.db;
    this.docker = new Docker({socketPath: input.dockerSocket});
  }

  async startSandbox(input: {sandboxId: string; createdBy: string; image: string; command: string[] | null; policy: PolicyRules}): Promise<string> {
    const container = await this.createContainerWithPull({
      image: input.image,
      command: input.command,
      policy: input.policy,
      sandboxId: input.sandboxId
    });

    await container.start();

    this.emit(input.sandboxId, 'lifecycle', `container_started:${container.id}`, {containerId: container.id});
    await this.attachLogs(input.sandboxId, container);

    return container.id;
  }

  async stopSandbox(input: {sandboxId: string; containerId: string}): Promise<void> {
    const container = this.docker.getContainer(input.containerId);
    try {
      await container.stop({t: 5});
    } catch {}
    try {
      await container.remove({force: true});
    } catch {}
    this.emit(input.sandboxId, 'lifecycle', `container_stopped:${input.containerId}`, {containerId: input.containerId});
  }

  async getContainerStatsSnapshot(containerId: string): Promise<{
    cpuPercent: number;
    memoryBytes: number;
    memoryLimitBytes: number;
    ts: number;
  }> {
    const container = this.docker.getContainer(containerId);
    const stats = (await container.stats({stream: false})) as any;

    const cpuDelta = (stats?.cpu_stats?.cpu_usage?.total_usage ?? 0) - (stats?.precpu_stats?.cpu_usage?.total_usage ?? 0);
    const systemDelta = (stats?.cpu_stats?.system_cpu_usage ?? 0) - (stats?.precpu_stats?.system_cpu_usage ?? 0);
    const onlineCpus = stats?.cpu_stats?.online_cpus ?? stats?.cpu_stats?.cpu_usage?.percpu_usage?.length ?? 1;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0;

    const memoryBytes = stats?.memory_stats?.usage ?? 0;
    const memoryLimitBytes = stats?.memory_stats?.limit ?? 0;

    return {cpuPercent, memoryBytes, memoryLimitBytes, ts: Date.now()};
  }

  private async createContainerWithPull(input: {image: string; command: string[] | null; policy: PolicyRules; sandboxId: string}): Promise<Docker.Container> {
    try {
      return await this.createContainer(input);
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      const statusCode = err?.statusCode as number | undefined;
      if (statusCode === 404 || message.includes('No such image')) {
        await this.pullImage(input.image, input.sandboxId);
        return await this.createContainer(input);
      }
      throw err;
    }
  }

  private async createContainer(input: {image: string; command: string[] | null; policy: PolicyRules}): Promise<Docker.Container> {
    const memoryBytes = Math.max(64, input.policy.memoryLimitMb) * 1024 * 1024;
    const nanoCpus = Math.max(0.1, input.policy.cpuLimit) * 1_000_000_000;

    return await this.docker.createContainer({
      Image: input.image,
      Cmd: input.command ?? undefined,
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: false,
      HostConfig: {
        NetworkMode: input.policy.allowNetwork ? 'bridge' : 'none',
        ReadonlyRootfs: input.policy.readOnlyRootFs,
        Memory: memoryBytes,
        NanoCpus: Math.floor(nanoCpus)
      }
    });
  }

  private async pullImage(image: string, sandboxId: string): Promise<void> {
    this.emit(sandboxId, 'lifecycle', `pull_start:${image}`, {image});
    const stream = await this.docker.pull(image);

    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (err: any) => {
          if (err) reject(err);
          else resolve();
        },
        (event: any) => {
          const status = typeof event?.status === 'string' ? event.status : 'pull_progress';
          const id = typeof event?.id === 'string' ? event.id : undefined;
          const msg = id ? `${status}:${id}` : status;
          this.emit(sandboxId, 'info', msg, event && typeof event === 'object' ? event : null);
        }
      );
    });

    this.emit(sandboxId, 'lifecycle', `pull_done:${image}`, {image});
  }

  private async attachLogs(sandboxId: string, container: Docker.Container): Promise<void> {
    const stream = (await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      timestamps: true
    })) as unknown as NodeJS.ReadableStream;

    const stdout = new PassThrough();
    const stderr = new PassThrough();
    this.docker.modem.demuxStream(stream, stdout, stderr);

    stdout.on('data', (chunk: Buffer) => this.emitLines(sandboxId, 'stdout', chunk.toString('utf8')));
    stderr.on('data', (chunk: Buffer) => this.emitLines(sandboxId, 'stderr', chunk.toString('utf8')));
    stream.on('error', (err: any) => this.emit(sandboxId, 'error', `log_stream_error:${String(err?.message ?? err)}`, null));

    container.wait().then(
      (res: any) => {
        const code = res?.StatusCode;
        this.emit(sandboxId, 'lifecycle', `container_exit:${String(code ?? 'unknown')}`, res && typeof res === 'object' ? res : null);
        if (typeof code === 'number' && code !== 0) {
          this.emit(sandboxId, 'alert', `nonzero_exit_code:${String(code)}`, {statusCode: code});
        }
      },
      (err: any) => {
        this.emit(sandboxId, 'error', `container_wait_error:${String(err?.message ?? err)}`, null);
      }
    );
  }

  private emitLines(sandboxId: string, type: 'stdout' | 'stderr', text: string): void {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) this.emit(sandboxId, type, line, null);
  }

  private emit(sandboxId: string, type: SandboxEventType, message: string, meta: Record<string, unknown> | null): void {
    const event = appendEvent(this.db, {sandboxId, ts: Date.now(), type, message, meta});
    publishEvent(event);
  }
}
