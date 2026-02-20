import { scaffoldWidget } from '../src/commands/scaffold';
import fs from 'fs-extra';
import path from 'path';

jest.mock('degit', () => {
  return jest.fn().mockImplementation(() => ({
    clone: async (dest: string) => {
      // create a minimal widgets folder inside dest
      const wdir = path.join(dest, 'widgets', 'sample-widget');
      await fs.ensureDir(wdir);
      await fs.writeJson(path.join(wdir, 'manifest.json'), { name: 'sample-widget', label: 'Sample Widget', description: 'desc' });
    }
  }));
});

jest.mock('enquirer', () => ({
  __esModule: true,
  default: {
    Select: jest.fn().mockImplementation((opts: any) => ({
      run: jest.fn().mockResolvedValue(opts.choices[0].value)
    }))
  }
}));

describe('scaffoldWidget (integration w/ degit + manifestCollector + picker)', () => {
  test('clones repo, lists widgets and lets user pick one', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await scaffoldWidget('widgetname');

    expect(logSpy).toHaveBeenCalled();
    const joined = (logSpy.mock.calls || []).map(c => c.join(' ')).join('\n');
    expect(joined).toMatch(/Found \d+ widgets in SDK-resources/);
    expect(joined).toMatch(/Sample Widget/);
    expect(joined).toMatch(/Selected:/);

    logSpy.mockRestore();
  });
});
