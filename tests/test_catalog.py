"""Run from the project directory: python -m unittest discover -s tests."""
import importlib.util
import tempfile
import unittest
import io
import json
import base64
import urllib.error
from unittest.mock import patch
from pathlib import Path

spec = importlib.util.spec_from_file_location('atlas', Path(__file__).resolve().parents[1] / 'server.py')
atlas = importlib.util.module_from_spec(spec)
spec.loader.exec_module(atlas)


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_dir = atlas.DATA_DIR
        atlas.DATA_DIR = Path(self.temp.name)
        self.catalog = {'schemaVersion': 1, 'seedVersion': 2,
                        'repositories': [{'id': 'demo/kept', 'description': 'Personale',
                                          'inspectionReport': 'Rapporto', 'notes': 'Note',
                                          'github': {'description': 'Remota'}}],
                        'settings': {'model': 'example', 'apiKey': 'must-not-save'},
                        'apiKey': 'must-not-save'}

    def tearDown(self):
        atlas.DATA_DIR = self.old_dir
        self.temp.cleanup()

    def test_roundtrip_preserves_version_and_user_content(self):
        atlas.write_catalog({'catalog': self.catalog, 'expectedRevision': ''})
        result = atlas.read_catalog()['catalog']
        self.assertEqual(result['seedVersion'], 2)
        self.assertEqual(result['repositories'],
                         [dict(self.catalog['repositories'][0], kind='github', url='https://github.com/demo/kept')])
        self.assertNotIn('apiKey', result)
        self.assertNotIn('apiKey', result['settings'])

    def test_conflict_does_not_overwrite_and_revision_allows_recovery(self):
        first = atlas.write_catalog({'catalog': self.catalog, 'expectedRevision': ''})
        self.catalog['repositories'][0]['notes'] = 'Nuova nota'
        with self.assertRaises(atlas.CatalogConflict):
            atlas.write_catalog({'catalog': self.catalog, 'expectedRevision': ''})
        self.assertEqual(atlas.read_catalog()['catalog']['repositories'][0]['notes'], 'Note')
        atlas.write_catalog({'catalog': self.catalog, 'expectedRevision': first['revision']})
        self.assertEqual(len(list((atlas.DATA_DIR / 'storico').glob('*.json'))), 1)
        self.assertEqual(atlas.read_catalog()['catalog']['repositories'][0]['notes'], 'Nuova nota')

    def test_legacy_catalog_and_invalid_version(self):
        del self.catalog['seedVersion']
        self.assertEqual(atlas.validate_catalog(self.catalog)['seedVersion'], 0)
        for version in [-1, True, '2', 2.5]:
            self.catalog['seedVersion'] = version
            with self.assertRaises(ValueError):
                atlas.validate_catalog(self.catalog)

    def test_upstream_errors_do_not_echo_credentials(self):
        for status, reason, expected in [(401, 'invalid_api_key', 'AI_AUTH'),
                                         (429, 'insufficient_quota', 'AI_QUOTA'),
                                         (429, 'rate_limit_exceeded', 'AI_RATE')]:
            raw = json.dumps({'error': {'code': reason, 'message': 'PRIVATE_SECRET'}}).encode()
            error = urllib.error.HTTPError('https://example.invalid', status, 'PRIVATE_SECRET', {}, io.BytesIO(raw))
            payload = atlas.remote_error_payload(error, 'ai')
            self.assertEqual(payload['code'], expected)
            self.assertEqual(payload['remoteStatus'], status)
            self.assertNotIn('PRIVATE_SECRET', json.dumps(payload))

    def test_server_log_records_metadata_only(self):
        atlas.record_event('AI_AUTH', 'analyze', 'ai', 401)
        event = json.loads((atlas.DATA_DIR / 'diagnostica.jsonl').read_text().splitlines()[-1])
        self.assertEqual(set(event), {'at', 'level', 'code', 'operation', 'service', 'status'})
        self.assertEqual(event['code'], 'AI_AUTH')
        self.assertEqual(atlas.read_diagnostic_events()[-1]['code'], 'AI_AUTH')

    def test_ai_verification_only_reads_models(self):
        with patch.object(atlas, 'remote_json', return_value={'data': [{'id': 'example'}]}) as remote:
            result = atlas.verify_ai({'provider':'groq','apiKey':'PRIVATE_KEY','model':'example'})
            self.assertTrue(result['authenticated'])
            self.assertTrue(result['modelListed'])
            url, headers = remote.call_args.args
            self.assertTrue(url.endswith('/models'))
            self.assertEqual(headers['Authorization'], 'Bearer PRIVATE_KEY')
            self.assertNotIn('PRIVATE_KEY', json.dumps(result))
        with patch.object(atlas, 'remote_json') as remote:
            with self.assertRaises(ValueError):
                atlas.verify_ai({'provider':'groq','apiKey':''})
            remote.assert_not_called()

    def test_openrouter_verification_only_reads_current_key(self):
        with patch.object(atlas, 'remote_json', return_value={'data': {'label':'PRIVATE_LABEL','limit_remaining':0}}) as remote:
            result = atlas.verify_ai({'provider':'openrouter','apiKey':'PRIVATE_KEY'})
            self.assertTrue(result['authenticated'])
            self.assertTrue(result['quotaExhausted'])
            self.assertEqual(remote.call_args.args[0], 'https://openrouter.ai/api/v1/key')
            self.assertNotIn('PRIVATE', json.dumps(result))

    def test_ideas_web_and_settings_roundtrip(self):
        self.catalog['schemaVersion'] = 2
        self.catalog['repositories'] += [
            {'id':'idea:12345678','kind':'idea','title':'Idea','url':'','reuse':'BLE','tags':'GPS','project':'HUD'},
            {'id':'web:12345678','kind':'web','title':'Articolo','url':'https://example.com/maps','reuse':'Tiles'}]
        self.catalog['settings'].update(theme='dark', githubOwner='baudinolorenzo73')
        atlas.write_catalog({'catalog':self.catalog,'expectedRevision':''})
        data = atlas.read_catalog()['catalog']
        self.assertEqual(data['schemaVersion'], 4)
        self.assertEqual(data['repositories'][1]['reuse'], 'BLE')
        self.assertEqual(data['repositories'][2]['url'], 'https://example.com/maps')
        self.assertEqual(data['settings']['theme'], 'dark')
        self.assertEqual(data['settings']['githubOwner'], 'baudinolorenzo73')

    def test_web_url_and_record_id_validation(self):
        for url in ('javascript:alert(1)', 'https://user:password@example.com', 'file:///tmp/test'):
            with self.assertRaises(ValueError):
                atlas.valid_web_url(url)
        self.assertEqual(atlas.valid_web_url('', optional=True), '')
        with self.assertRaises(ValueError):
            atlas.valid_record_id('web', 'owner/repository')
        with self.assertRaises(ValueError):
            atlas.valid_record_id('unknown', 'idea:12345678')

    def test_capture_roundtrip_and_field_filter(self):
        image = 'data:image/png;base64,' + base64.b64encode(b'\x89PNG\r\n\x1a\nimage-fixture').decode()
        self.catalog['repositories'][0]['capture'] = {'imageDataUrl':image,'origin':'ScreenAI',
            'capturedAt':'2026-11-07T06:00:00Z','originalAnalysis':'Originale','provider':'Groq','model':'vision','apiKey':'DO_NOT_STORE'}
        atlas.write_catalog({'catalog':self.catalog,'expectedRevision':''})
        capture = atlas.read_catalog()['catalog']['repositories'][0]['capture']
        self.assertEqual(capture['imageDataUrl'], image)
        self.assertEqual(capture['originalAnalysis'], 'Originale')
        self.assertNotIn('apiKey', capture)

    def test_invalid_capture_sources_rejected(self):
        for value in ('https://example.com/img.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,YmFk'):
            with self.assertRaises(ValueError):
                atlas.valid_image_data(value)

    def test_vision_payload_and_no_provider_key_in_result(self):
        image = 'data:image/png;base64,' + base64.b64encode(b'\x89PNG\r\n\x1a\nimage-fixture').decode()
        with patch.object(atlas, 'remote_json', return_value={'choices':[{'message':{'content':'Analisi immagine'}}]}) as remote:
            result = atlas.analyze_capture({'provider':'groq','model':'vision','apiKey':'PRIVATE_KEY','imageDataUrl':image})
            self.assertEqual(result['analysis'], 'Analisi immagine')
            payload = json.loads(remote.call_args.args[2])
            self.assertEqual(payload['messages'][1]['content'][1]['image_url']['url'], image)
            self.assertNotIn('PRIVATE_KEY', json.dumps(result))

    def test_photo_analysis_includes_user_context_and_rejects_excess(self):
        image = 'data:image/png;base64,' + base64.b64encode(b'\x89PNG\r\n\x1a\nimage-fixture').decode()
        with patch.object(atlas, 'remote_json', return_value={'choices':[{'message':{'content':'Analisi'}}]}) as remote:
            atlas.analyze_capture({'provider':'ollama','model':'vision','imageDataUrl':image,
                                   'context':'Cartello: percorso da verificare'})
            payload = json.loads(remote.call_args.args[2])
            self.assertIn('percorso da verificare', payload['messages'][1]['content'][0]['text'])
            with self.assertRaises(ValueError):
                atlas.analyze_capture({'provider':'ollama','model':'vision','imageDataUrl':image,
                                       'context':'x'*6001})

    def test_ollama_verification_lists_local_models(self):
        with patch.object(atlas, 'remote_json', return_value={'data':[{'id':'gemma3:4b'}, {'id':'nomic-embed-text'}]}):
            result = atlas.verify_ai({'provider':'ollama','model':'gemma3:4b'})
        self.assertTrue(result['modelListed'])
        self.assertEqual(result['availableModels'], ['gemma3:4b', 'nomic-embed-text'])


if __name__ == '__main__':
    unittest.main()
