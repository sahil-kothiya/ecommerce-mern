import { describe, expect, test } from 'vitest';
import NotFound from './NotFound.jsx';

describe('NotFound page', () => {
    test('exports a valid component', () => {
        expect(NotFound).toBeTypeOf('function');
    });
});
