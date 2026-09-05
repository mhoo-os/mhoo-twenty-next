"""Shell boundary regression tests. These do not replace PG16 image acceptance."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
ENTRYPOINT = ROOT / 'packages/twenty-docker/twenty/entrypoint.sh'


class EntrypointTests(unittest.TestCase):
    def run_startup(self, **overrides):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            log = root / 'calls'
            log.touch()
            commands = {
                'psql': '''#!/bin/sh
printf 'psql\\n' >> "$CALLS"
[ "${QUERY_FAIL:-false}" = true ] && exit 2
case "$*" in
  *to_regclass*) printf '%s\\n' "${HAS_WORKSPACE:-t}" ;;
  *) printf '%s\\n' "${HAS_SCHEMA:-t}" ;;
esac
''',
                'yarn': '''#!/bin/sh
printf 'yarn %s\\n' "$*" >> "$CALLS"
[ "$*" = "${FAIL_COMMAND:-}" ] && exit 1
exit 0
''',
                'node': '''#!/bin/sh
printf 'validate-init\\n' >> "$CALLS"
[ "${INCOMPLETE_LEGACY:-false}" = true ] && exit 1
exit 0
''',
                'serve': '''#!/bin/sh
printf 'serve\\n' >> "$CALLS"
''',
            }
            for name, contents in commands.items():
                path = root / name
                path.write_text(contents)
                path.chmod(0o700)
            env = {**os.environ, 'PATH': str(root) + ':' + os.environ['PATH'],
                   'CALLS': str(log), 'PG_DATABASE_URL': 'postgres://synthetic/test',
                   **overrides}
            result = subprocess.run(['sh', str(ENTRYPOINT), 'serve'], env=env,
                                    capture_output=True, text=True)
            return result, log.read_text()

    def test_fresh_database_initializes_before_serving(self):
        result, calls = self.run_startup(HAS_SCHEMA='f')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('yarn database:init:prod', calls)
        self.assertTrue(calls.endswith('serve\n'))

    def test_existing_database_is_not_reinitialized(self):
        result, calls = self.run_startup()
        self.assertEqual(result.returncode, 0)
        self.assertNotIn('database:init:prod', calls)
        self.assertIn('yarn command:prod upgrade', calls)

    def test_schema_only_interrupted_initialization_stops_without_writes(self):
        result, calls = self.run_startup(HAS_WORKSPACE='f')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('initialization is incomplete', result.stderr)
        self.assertNotIn('yarn', calls)
        self.assertNotIn('serve', calls)

    def test_workspace_table_with_pending_legacy_migrations_never_serves(self):
        result, calls = self.run_startup(INCOMPLETE_LEGACY='true')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('validate-init', calls)
        self.assertNotIn('yarn', calls)
        self.assertNotIn('serve', calls)
        self.assertNotIn('Successfully migrated', result.stdout)

    def test_failed_initialization_never_serves(self):
        result, calls = self.run_startup(HAS_SCHEMA='f', FAIL_COMMAND='database:init:prod')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('serve', calls)

    def test_failed_upgrade_never_claims_success_or_serves(self):
        result, calls = self.run_startup(FAIL_COMMAND='command:prod upgrade')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('Successfully migrated', result.stdout)
        self.assertNotIn('serve', calls)

    def test_failed_database_query_stops(self):
        result, calls = self.run_startup(QUERY_FAIL='true')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('yarn', calls)

    def test_unexpected_database_result_stops(self):
        result, calls = self.run_startup(HAS_SCHEMA='unknown')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('serve', calls)

    def test_worker_explicitly_disables_migrations_and_cron(self):
        result, calls = self.run_startup(DISABLE_DB_MIGRATIONS='true',
                                        DISABLE_CRON_JOBS_REGISTRATION='true')
        self.assertEqual(result.returncode, 0)
        self.assertEqual(calls, 'serve\n')

    def test_cache_failure_preserves_existing_warning_policy(self):
        result, calls = self.run_startup(FAIL_COMMAND='command:prod cache:flush')
        self.assertEqual(result.returncode, 0)
        self.assertIn('Warning:', result.stdout)
        self.assertTrue(calls.endswith('serve\n'))

    def test_cron_failure_preserves_existing_warning_policy(self):
        result, calls = self.run_startup(FAIL_COMMAND='command:prod cron:register:all')
        self.assertEqual(result.returncode, 0)
        self.assertIn('Warning:', result.stdout)
        self.assertTrue(calls.endswith('serve\n'))


class VersionMetadataTests(unittest.TestCase):
    def test_workflow_version_is_semantic_and_preserves_full_source_sha(self):
        workflow = (ROOT / '.github/workflows/clean-foundation-image.yml').read_text()
        block = workflow.split('        run: |\n', 1)[1].split('      - uses:', 1)[0]
        script = '\n'.join(line[10:] for line in block.splitlines())
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'output'
            sha = 'a' * 40
            result = subprocess.run(['bash', '-e', '-c', script], cwd=ROOT,
                                    env={**os.environ, 'GITHUB_SHA': sha,
                                         'GITHUB_OUTPUT': str(output)},
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(output.read_text(), 'app_version=2.37.0+' + sha + '\n')
            result = subprocess.run(['bash', '-e', '-c', script], cwd=ROOT,
                                    env={**os.environ, 'GITHUB_SHA': 'invalid',
                                         'GITHUB_OUTPUT': str(output)},
                                    capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()
