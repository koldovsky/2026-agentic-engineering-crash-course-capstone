<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\domain;

use app\modules\mail_service\domain\RequestSignature;
use Codeception\Test\Unit;

final class RequestSignatureTest extends Unit
{
    private const BODY = '{"request_id":"1"}';

    public function testCorrectKeyAndSignatureAreValid(): void
    {
        $signature = new RequestSignature('test-key', 'test-secret');

        $this->assertTrue($signature->isValid('test-key', hash_hmac('sha256', self::BODY, 'test-secret'), self::BODY));
    }

    public function testWrongApiKeyIsInvalid(): void
    {
        $signature = new RequestSignature('test-key', 'test-secret');

        $this->assertFalse($signature->isValid('other', hash_hmac('sha256', self::BODY, 'test-secret'), self::BODY));
    }

    public function testSignatureOfAnotherBodyIsInvalid(): void
    {
        $signature = new RequestSignature('test-key', 'test-secret');

        $this->assertFalse($signature->isValid('test-key', hash_hmac('sha256', 'other', 'test-secret'), self::BODY));
    }

    public function testMissingHeadersAreInvalid(): void
    {
        $signature = new RequestSignature('test-key', 'test-secret');

        $this->assertFalse($signature->isValid(null, null, self::BODY));
    }

    public function testUnconfiguredKeysRejectEverything(): void
    {
        $signature = new RequestSignature('', '');

        $this->assertFalse($signature->isValid('', hash_hmac('sha256', self::BODY, ''), self::BODY));
    }
}
