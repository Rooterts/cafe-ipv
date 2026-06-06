/**
 * Release creation script.
 * Creates a Git tag and optionally a GitHub release from the changes
 * between the last two "bump: version to" commits.
 *
 * Usage: pnpm create-release [--no-push] [--no-gh]
 *   --no-push  Skip pushing the tag to remote
 *   --no-gh    Skip creating a GitHub release (only tag is created)
 */

import { log, error as elog } from 'node:console';
import { exec } from './utils/exec';

interface Options {
  push: boolean;
  ghRelease: boolean;
}

const parseArgs = (): Options => {
  const args = process.argv.slice(2);
  return {
    push: !args.includes('--no-push'),
    ghRelease: !args.includes('--no-gh'),
  };
};

const getLastTwoBumpCommits = async (): Promise<[string, string]> => {
  const commits = await exec(
    'git',
    ['log', '--format=%H', '--grep="^bump: version to"', '-n', '2'],
    { capture: true }
  );

  const [latest, previous] = commits.trim().split('\n');
  if (!latest || !previous) {
    throw new Error(
      'Need at least two version bump commits. Run `pnpm sync-version` first.'
    );
  }
  return [latest, previous];
};

const getVersionFromCommit = async (commitHash: string): Promise<string> => {
  const message = await exec(
    'git',
    ['log', '--format=%s', '-n', '1', commitHash],
    { capture: true }
  );
  const match = message.trim().match(/^bump: version to (\d+\.\d+\.\d+)$/);
  if (!match || !match[1]) {
    throw new Error(`Could not extract version from commit ${commitHash}`);
  }
  return match[1];
};

const generateReleaseNotes = async (
  previousCommit: string,
  latestCommit: string
): Promise<string> => {
  const logOutput = await exec(
    'git',
    ['log', '--oneline', '--no-decorate', `${previousCommit}..${latestCommit}`],
    { capture: true }
  );
  if (!logOutput.trim()) {
    return 'No changes recorded between the two version bumps.';
  }
  return logOutput.trim();
};

const checkGhCli = async (): Promise<boolean> => {
  try {
    await exec('gh', ['--version'], { capture: true });
    return true;
  } catch {
    return false;
  }
};

const createRelease = async () => {
  const options = parseArgs();

  log('-> Finding last two version bump commits...');
  const [latestCommit, previousCommit] = await getLastTwoBumpCommits();

  log(`-> Latest bump commit: ${latestCommit}`);
  log(`-> Previous bump commit: ${previousCommit}`);

  const newVersion = await getVersionFromCommit(latestCommit);
  log(`-> Version to release: ${newVersion}`);

  log('\n-> Generating release notes...');
  const releaseNotes = await generateReleaseNotes(previousCommit, latestCommit);
  log(releaseNotes);
  log('');

  // Create annotated tag
  const tagName = `v${newVersion}`;
  log(`-> Creating tag ${tagName}...`);
  await exec('git', ['tag', '-a', tagName, '-m', `"Release ${tagName}"`]);

  if (options.push) {
    log(`-> Pushing tag ${tagName} to remote...`);
    await exec('git', ['push', 'origin', tagName]);
  } else {
    log('-> Skipping push (--no-push)');
  }

  if (options.ghRelease) {
    const ghAvailable = await checkGhCli();
    if (!ghAvailable) {
      elog('-> GitHub CLI (gh) not found. Skipping GitHub release creation.');
      elog('-> Install gh from https://cli.github.com/ or use --no-gh');
    } else {
      log('-> Creating GitHub release...');
      const notesFile = '.release-notes.tmp';
      const { writeFile, unlink } = await import('node:fs/promises');
      await writeFile(notesFile, releaseNotes, 'utf-8');
      try {
        await exec('gh', [
          'release',
          'create',
          tagName,
          '--title',
          `"Release ${tagName}"`,
          '--notes-file',
          notesFile,
        ]);
        log(`-> GitHub release ${tagName} created`);
      } finally {
        await unlink(notesFile).catch(() => {});
      }
    }
  } else {
    log('-> Skipping GitHub release (--no-gh)');
  }

  log('\n-> Release process completed!');
};

createRelease().catch((err) => {
  elog(`-> Release failed: ${err.message}`);
  process.exit(1);
});
