import * as fmt from '../src/commands/format';
import pacote from 'pacote';

jest.mock('pacote');

describe('format helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('suggestExbName — plain and scoped', () => {
    expect(fmt.suggestExbName('abls')).toBe('exb-abls');
    expect(fmt.suggestExbName('@scope/pkg')).toBe('@scope/exb-pkg');
  });

  test('isNameAvailable -> package exists', async () => {
    (pacote.packument as jest.Mock).mockResolvedValueOnce({});
    await expect(fmt.isNameAvailable('exists')).resolves.toBe(false);
  });

  test('isNameAvailable -> package missing (404)', async () => {
    (pacote.packument as jest.Mock).mockRejectedValueOnce({ statusCode: 404 });
    await expect(fmt.isNameAvailable('missing')).resolves.toBe(true);
  });

  test('validateAndChooseName returns original when available (force)', async () => {
    // mock pacote.packument to throw 404 for 'unique-name' (available), resolve for others
    (pacote.packument as jest.Mock).mockImplementationOnce((n: string) => {
      if (n === 'unique-name') return Promise.reject({ statusCode: 404 });
      return Promise.resolve({});
    });

    await expect(fmt.validateAndChooseName('unique-name', true)).resolves.toBe('unique-name');
  });

  test('validateAndChooseName suggests exb- prefix when taken (force)', async () => {
    // abls -> exists, exb-abls -> not found
    (pacote.packument as jest.Mock).mockImplementation((n: string) => {
      if (n === 'abls') return Promise.resolve({});
      if (n === 'exb-abls') return Promise.reject({ statusCode: 404 });
      return Promise.resolve({});
    });

    await expect(fmt.validateAndChooseName('abls', true)).resolves.toBe('exb-abls');
  });

  test('makeUniqueName appends numeric suffix when needed', async () => {
    // base exists, base-1 available
    (pacote.packument as jest.Mock).mockImplementation((n: string) => {
      if (n === 'base') return Promise.resolve({});
      if (n === 'base-1') return Promise.reject({ statusCode: 404 });
      return Promise.resolve({});
    });

    await expect(fmt.makeUniqueName('base')).resolves.toBe('base-1');
  });
});
