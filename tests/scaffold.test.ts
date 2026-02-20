jest.mock('fs-extra', () => ({
  // Prevent any real filesystem ops during the test
  existsSync: jest.fn(() => true),
  pathExists: jest.fn().mockResolvedValue(true),
  ensureDir: jest.fn().mockResolvedValue(undefined),
  copy: jest.fn().mockResolvedValue(undefined),
  readJson: jest.fn().mockResolvedValue({ name: 'sample-widget', label: 'Sample Widget', description: 'desc' }),
  writeJson: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('degit', () => {
  // do not touch the real filesystem in tests — just verify `degit` was called
  return jest.fn().mockImplementation((_source: string) => ({
    clone: jest.fn().mockResolvedValue(undefined)
  }));
});

jest.mock('../src/utils/manifestCollector', () => ({
  // Return a manifest map as if the repo contained one widget. No I/O.
  collectManifests: jest.fn().mockResolvedValue({
    'widgets/sample-widget/manifest.json': { name: 'sample-widget', label: 'Sample Widget', description: 'desc' }
  })
}));

jest.mock('enquirer', () => ({
  __esModule: true,
  default: {
    Select: jest.fn().mockImplementation((opts: any) => ({
      run: jest.fn().mockResolvedValue(opts.choices[0].value)
    }))
  }
}));

import path from 'path';
import { scaffoldWidget } from '../src/commands/scaffold';

describe('scaffoldWidget (integration w/ degit + manifestCollector + picker)', () => {
  test('clones repo, uses manifests from the repository and lets user pick one (no fs writes)', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // call
    await scaffoldWidget('widgetname');

    // verify degit was invoked with the SDK-resources widgets path
    const degitMock = require('degit') as jest.Mock;
    expect(degitMock).toHaveBeenCalled();
    expect(degitMock.mock.calls[0][0]).toBe('Esri/arcgis-experience-builder-sdk-resources/widgets');

    // verify manifest collector was used (we returned the sample manifest)
    const mc = require('../src/utils/manifestCollector');
    expect(mc.collectManifests).toHaveBeenCalled();

    // verify the prompt received choices produced from our mocked manifests
    const Enquirer = require('enquirer');
    const SelectMock = Enquirer.default.Select as jest.Mock;
    expect(SelectMock).toHaveBeenCalled();
    const opts = SelectMock.mock.calls[0][0];
    const hasSample = opts.choices.some((c: any) => {
      const v = typeof c === 'string' ? c : c.value || c.name;
      return String(v).includes('widgets/sample-widget');
    });
    expect(hasSample).toBeTruthy();

    // verify console output still shows expected messages
    expect(logSpy).toHaveBeenCalled();
    const joined = (logSpy.mock.calls || []).map(c => c.join(' ')).join('\n');
    expect(joined).toMatch(/Found \d+ widgets in SDK-resources/);
    expect(joined).toMatch(/Sample Widget/);
    expect(joined).toMatch(/widgetname/);

    logSpy.mockRestore();
  });
});
