/**
 * 간단한 테스트 파일
 */

describe('간단한 테스트', () => {
    it('1 + 1 = 2', () => {
        expect(1 + 1).toBe(2);
    });

    it('문자열 테스트', () => {
        expect('hello').toBe('hello');
    });

    it('배열 테스트', () => {
        expect([1, 2, 3]).toHaveLength(3);
    });
});
