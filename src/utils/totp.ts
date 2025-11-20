// Secret 预处理函数 - 清理各种格式
export function normalizeSecret(secret: string): string {
    // 移除所有空格、换行符、制表符
    secret = secret.replace(/\s/g, '');
    // 移除常见的分隔符：-、*、.、,、_
    secret = secret.replace(/[-*.,_]/g, '');
    // 转换为大写
    secret = secret.toUpperCase();
    // 移除尾部的等号
    secret = secret.replace(/=+$/, '');
    return secret;
}

// Base32 解码函数 - 转换为 Uint8Array
function base32ToBytes(base32: string): Uint8Array {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    // 预处理 secret
    base32 = normalizeSecret(base32);

    // 验证并转换
    let bits = '';
    for (let i = 0; i < base32.length; i++) {
        const val = base32Chars.indexOf(base32[i]);
        if (val === -1) {
            throw new Error(`无效字符 '${base32[i]}' 在位置 ${i}。Secret 应该只包含 A-Z 和 2-7`);
        }
        bits += val.toString(2).padStart(5, '0');
    }

    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }

    return new Uint8Array(bytes);
}

// 使用 Web Crypto API 生成 TOTP 代码
export async function generateTOTP(secret: string, timeStep = 30): Promise<string> {
    try {
        // 解码 Base32 密钥
        const keyBytes = base32ToBytes(secret);

        // 计算时间片
        const epoch = Math.floor(Date.now() / 1000);
        const counter = Math.floor(epoch / timeStep);

        // 将 counter 转换为 8 字节数组（大端序）
        const counterBytes = new ArrayBuffer(8);
        const counterView = new DataView(counterBytes);
        counterView.setUint32(4, counter, false); // 大端序

        // 导入密钥
        const key = await crypto.subtle.importKey(
            'raw',
            keyBytes as BufferSource,
            { name: 'HMAC', hash: { name: 'SHA-1' } },
            false,
            ['sign']
        );

        // 计算 HMAC-SHA1
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            counterBytes
        );

        // 转换为 Uint8Array
        const hmacArray = new Uint8Array(signature);

        // 动态截断
        const offset = hmacArray[hmacArray.length - 1] & 0x0f;
        const view = new DataView(hmacArray.buffer);
        const truncatedHash = view.getUint32(offset, false) & 0x7fffffff;

        // 生成 6 位 OTP
        const otp = (truncatedHash % 1000000).toString().padStart(6, '0');

        return otp;
    } catch (error) {
        throw new Error('Secret 格式错误，请确保使用有效的 Base32 格式');
    }
}
