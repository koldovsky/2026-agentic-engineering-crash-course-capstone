<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\domain;

use app\domain\process\Status;
use app\modules\mail_service\domain\InvalidMailRequest;
use app\modules\mail_service\domain\MailData;
use app\modules\mail_service\domain\RequestBodyBuilder;
use app\modules\mail_service\domain\StatusMapper;
use Codeception\Test\Unit;

final class DomainTest extends Unit
{
    private const DATA = ['user_id' => 42, 'send_to' => 'user@example.com', 'test' => 'Hello'];

    public function testBuilderBuildsRemoteBodyWithCallbackUrlAndWithoutUserId(): void
    {
        $body = (new RequestBodyBuilder())->build('123344', 'general', MailData::fromArray(self::DATA));

        $this->assertSame([
            'request_id' => '123344',
            'service' => 'general',
            'to' => 'user@example.com',
            'text' => 'Hello',
            'callback_url' => 'http://demo.dev/mail_service/v1/callback',
        ], $body);
    }

    public function testBuilderRejectsUnknownServiceMethod(): void
    {
        $this->expectException(InvalidMailRequest::class);

        (new RequestBodyBuilder())->build('1', 'other', MailData::fromArray(self::DATA));
    }

    public function testBuilderIgnoresCallbackUrlInData(): void
    {
        $data = MailData::fromArray(self::DATA + ['callback_url' => 'http://evil.example/']);

        $body = (new RequestBodyBuilder())->build('1', 'process', $data);

        $this->assertSame(RequestBodyBuilder::CALLBACK_URL, $body['callback_url']);
    }

    /**
     * @dataProvider invalidData
     * @param array<string, mixed> $data
     */
    public function testMailDataRejectsInvalidData(array $data): void
    {
        $this->expectException(InvalidMailRequest::class);

        MailData::fromArray($data);
    }

    /** @return array<string, array{array<string, mixed>}> */
    public static function invalidData(): array
    {
        return [
            'user_id missing' => [['send_to' => 'a@b.c', 'test' => 'x']],
            'user_id not int' => [['user_id' => '42', 'send_to' => 'a@b.c', 'test' => 'x']],
            'send_to too long' => [['user_id' => 1, 'send_to' => str_repeat('a', 17), 'test' => 'x']],
            'send_to missing' => [['user_id' => 1, 'test' => 'x']],
            'test missing' => [['user_id' => 1, 'send_to' => 'a@b.c']],
        ];
    }

    public function testMailDataAcceptsSendToOfMaxLength(): void
    {
        $data = MailData::fromArray(['user_id' => 1, 'send_to' => str_repeat('a', 16), 'test' => 'x']);

        $this->assertSame(16, mb_strlen($data->sendTo));
    }

    /**
     * @dataProvider statuses
     */
    public function testStatusMapperMapsResponseAndCallback(mixed $remote, string $expected): void
    {
        $mapper = new StatusMapper();

        $this->assertSame($expected, $mapper->fromResponse($remote)->value);
        $this->assertSame($expected, $mapper->fromCallback($remote)->value);
    }

    /** @return array<string, array{mixed, string}> */
    public static function statuses(): array
    {
        return [
            'Sended' => ['Sended', 'success'],
            'Sending' => ['Sending', 'process'],
            'Fail' => ['Fail', 'fail'],
            'unknown value' => ['Unknown', 'fail'],
            'missing' => [null, 'fail'],
        ];
    }
}
