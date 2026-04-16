import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as os from 'os';

/**
 * Native folder picker — spawns the OS's native "choose folder" dialog
 * and returns the selected absolute path.
 *
 * macOS: osascript with AppleScript 'choose folder'
 * Windows: PowerShell System.Windows.Forms.FolderBrowserDialog
 * Linux: zenity --file-selection --directory (if installed)
 *
 * Works because CodeView runs as a local dev server — the server IS
 * the user's machine, so invoking native dialogs is safe here.
 */
export async function GET() {
  const platform = os.platform();

  try {
    const path = await pickFolder(platform);
    if (!path) {
      return NextResponse.json({ ok: false, cancelled: true });
    }
    return NextResponse.json({ ok: true, path });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Folder picker failed',
      platform,
    }, { status: 500 });
  }
}

function pickFolder(platform: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let cmd: string;
    let args: string[];

    if (platform === 'darwin') {
      cmd = 'osascript';
      args = ['-e', 'POSIX path of (choose folder with prompt "Select a project to visualise")'];
    } else if (platform === 'win32') {
      cmd = 'powershell';
      args = [
        '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = "Select a project to visualise"; if ($d.ShowDialog() -eq "OK") { $d.SelectedPath }',
      ];
    } else {
      // linux — try zenity
      cmd = 'zenity';
      args = ['--file-selection', '--directory', '--title=Select a project to visualise'];
    }

    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    child.on('close', (code) => {
      const trimmed = stdout.trim();
      if (!trimmed) {
        // User cancelled or no selection
        resolve(null);
        return;
      }
      // osascript trailing newline already trimmed
      resolve(trimmed);
    });

    child.on('error', (err) => {
      reject(new Error(`Couldn't launch native folder picker: ${err.message}. On Linux, install zenity. You can still paste a path manually.`));
    });
  });
}
