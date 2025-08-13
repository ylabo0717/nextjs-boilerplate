#!/usr/bin/env node

/**
 * Post release notification to GitHub issues and job summary
 *
 * This script handles notification tasks after a successful release:
 * - Comments on open release issues with the new version
 * - Adds release information to GitHub Actions job summary
 */

import fs from 'fs';
import path from 'path';

async function postReleaseNotification({ github, context, core }) {
  // Get version from package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const version = packageJson.version;

  // Get repository information from environment
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY environment variable is required');
  }

  const releaseUrl = `https://github.com/${repository}/releases/tag/v${version}`;

  console.log(`Processing release notification for version ${version}`);
  console.log(`Release URL: ${releaseUrl}`);

  try {
    // Find the latest 'release' issue and comment
    const issues = await github.rest.issues.listForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
      state: 'open',
      labels: 'release',
    });

    if (issues.data.length > 0) {
      console.log(`Found ${issues.data.length} open release issue(s)`);

      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issues.data[0].number,
        body: `🎉 **Version ${version} has been released!**\n\n[View Release](${releaseUrl})`,
      });

      console.log(`Posted comment to issue #${issues.data[0].number}`);
    } else {
      console.log('No open release issues found');
    }

    // Add to job summary
    await core.summary
      .addHeading('🚀 Release Published')
      .addRaw(`Version **${version}** has been successfully released!`)
      .addLink('View Release', releaseUrl)
      .write();

    console.log('Added release summary to job output');
  } catch (error) {
    console.error('Error posting release notification:', error);
    throw error;
  }
}

export { postReleaseNotification };

// For GitHub Actions script usage
if (
  typeof github !== 'undefined' &&
  typeof context !== 'undefined' &&
  typeof core !== 'undefined'
) {
  postReleaseNotification({ github, context, core }).catch((error) => {
    core.setFailed(`Release notification failed: ${error.message}`);
    process.exit(1);
  });
}
