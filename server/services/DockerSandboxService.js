import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runBacktest } from '../domain/backtest/BacktestEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspacePath = path.resolve(__dirname, '..', '..');
const tempDir = path.join(workspacePath, 'server', 'temp');

export class DockerSandboxService {
  constructor() {
    this.#dockerAvailable = this.#checkDockerAvailability();
  }

  #dockerAvailable;

  #checkDockerAvailability() {
    try {
      // Run docker info with a 2-second timeout to see if Docker is running
      execSync('docker info', { stdio: 'ignore', timeout: 2000 });
      return true;
    } catch {
      console.warn('Docker daemon not detected. Falling back to safe in-memory execution.');
      return false;
    }
  }

  async runBacktest(params) {
    if (!this.#dockerAvailable) {
      // Graceful fallback to safe in-memory execution on host
      return runBacktest(params);
    }

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempId = Math.random().toString(36).substring(7);
    const tempFileName = `input_${tempId}.json`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // Write parameters to input JSON file
    fs.writeFileSync(tempFilePath, JSON.stringify(params), 'utf8');

    try {
      // Formulate the hardened docker run command
      // - u 1000:1000 runs as non-root user
      // - network none prevents network access
      // - read-only locks container filesystem changes
      // - memory limits caps RAM at 256MB
      // - cpus limits CPU cores allocation to 0.5
      // - pids-limit prevents fork bombs
      // - execution timeout handled via process execution timeout limit (15 seconds)
      const command = `docker run --rm --network none --read-only --memory 256m --cpus 0.5 --pids-limit 20 -u 1000:1000 -v "${workspacePath}":/app:ro node:18-alpine node /app/server/engine/backtestInContainer.js /app/server/temp/${tempFileName}`;

      const output = execSync(command, { encoding: 'utf8', timeout: 15000 });
      const parsed = JSON.parse(output);

      if (!parsed.success) {
        throw new Error(parsed.error || 'Backtest failed inside container');
      }
      return parsed.result;
    } catch (err) {
      // If docker run fails due to container constraints, timeout, or environment, throw/fallback
      if (err.code === 'ETIMEDOUT') {
        throw new Error('Strategy execution timed out inside sandbox container');
      }
      console.warn(`Docker sandbox run failed: ${err.message}. Falling back to in-memory execution.`);
      return runBacktest(params);
    } finally {
      // Clean up temp parameters file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupErr) {
        console.error('Failed to cleanup temp sandbox file:', cleanupErr.message);
      }
    }
  }
}

export const dockerSandboxService = new DockerSandboxService();
