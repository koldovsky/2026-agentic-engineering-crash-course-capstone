<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\domain;

use app\modules\mail_service\domain\InitRequest;
use app\modules\mail_service\domain\InvalidInitRequest;
use Codeception\Test\Unit;

final class InitRequestTest extends Unit
{
    private const VALID = [
        'request_id' => '123344',
        'service' => 'general',
        'to' => 'user@example.com',
        'text' => 'Hello',
        'callback_url' => 'http://demo.dev/mail_service/v1/callback',
    ];

    public function testValidBodyIsAccepted(): void
    {
        $request = InitRequest::fromArray(self::VALID);

        $this->assertSame('general', $request->service);
        $this->assertSame('http://demo.dev/mail_service/v1/callback', $request->callbackUrl);
    }

    public function testEveryMissingFieldIsReported(): void
    {
        foreach (array_keys(self::VALID) as $field) {
            $body = self::VALID;
            unset($body[$field]);

            try {
                InitRequest::fromArray($body);
                $this->fail("InvalidInitRequest expected for missing $field");
            } catch (InvalidInitRequest $e) {
                $this->assertSame($field, $e->errors[0]['field']);
            }
        }
    }

    public function testNonStringFieldIsRejected(): void
    {
        $this->expectException(InvalidInitRequest::class);
        InitRequest::fromArray(['to' => 42] + self::VALID);
    }

    public function testUnknownServiceIsRejected(): void
    {
        try {
            InitRequest::fromArray(['service' => 'other'] + self::VALID);
            $this->fail('InvalidInitRequest expected');
        } catch (InvalidInitRequest $e) {
            $this->assertSame('service', $e->errors[0]['field']);
        }
    }
}
