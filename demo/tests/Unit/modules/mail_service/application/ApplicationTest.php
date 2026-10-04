<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\application;

use app\domain\process\Status;
use app\modules\mail_service\application\ReadCallback;
use app\modules\mail_service\application\SendMail;
use app\modules\mail_service\domain\InvalidMailRequest;
use app\modules\mail_service\domain\RemoteServiceClient;
use app\modules\mail_service\domain\RequestBodyBuilder;
use app\modules\mail_service\domain\StatusMapper;
use Codeception\Test\Unit;
use RuntimeException;

final class ApplicationTest extends Unit
{
    private const DATA = ['user_id' => 42, 'send_to' => 'user@example.com', 'test' => 'Hello'];

    public function testSendMailPostsBodyAndMapsProcessStatus(): void
    {
        $client = $this->client(['id' => 'ext-1001', 'status' => 'Sending']);

        $result = $this->sendMail($client)->execute('123344', 'general', self::DATA);

        $this->assertSame('ext-1001', $result['externalId']);
        $this->assertSame(Status::Process, $result['status']);
        $this->assertSame([['/init-process', 'POST', [
            'request_id' => '123344',
            'service' => 'general',
            'to' => 'user@example.com',
            'text' => 'Hello',
            'callback_url' => 'http://demo.dev/mail_service/v1/callback',
        ]]], $client->calls);
    }

    public function testSendMailMapsFinalStatuses(): void
    {
        $this->assertSame(
            Status::Success,
            $this->sendMail($this->client(['id' => 'a', 'status' => 'Sended']))->execute('1', 'process', self::DATA)['status']
        );
        $this->assertSame(
            Status::Fail,
            $this->sendMail($this->client(['id' => 'a', 'status' => 'Fail']))->execute('1', 'process', self::DATA)['status']
        );
        $this->assertSame(
            Status::Fail,
            $this->sendMail($this->client(['id' => 'a', 'status' => 'Weird']))->execute('1', 'process', self::DATA)['status']
        );
    }

    public function testSendMailDoesNotCallRemoteServiceForInvalidData(): void
    {
        $client = $this->client(['id' => 'a', 'status' => 'Sended']);

        try {
            $this->sendMail($client)->execute('1', 'general', ['user_id' => 1]);
            $this->fail('InvalidMailRequest expected');
        } catch (InvalidMailRequest) {
            $this->assertSame([], $client->calls);
        }
    }

    public function testSendMailRejectsAnswerWithoutId(): void
    {
        $this->expectException(InvalidMailRequest::class);

        $this->sendMail($this->client(['status' => 'Sending']))->execute('1', 'general', self::DATA);
    }

    public function testSendMailPropagatesTransportError(): void
    {
        $this->expectException(RuntimeException::class);

        $this->sendMail($this->client(null))->execute('1', 'general', self::DATA);
    }

    public function testReadCallback(): void
    {
        $reader = new ReadCallback(new StatusMapper());
        $body = ['id' => 'ext-1001', 'status' => 'Sended', 'created_at' => 1, 'updated_at' => 2];

        $this->assertSame('ext-1001', $reader->externalId($body));
        $this->assertSame(Status::Success, $reader->status($body));
        $this->assertSame(Status::Fail, $reader->status(['id' => 'x', 'status' => 'Nope']));
        $this->assertSame('', $reader->externalId(['status' => 'Sended']));
    }

    private function sendMail(RemoteServiceClient $client): SendMail
    {
        return new SendMail($client, new RequestBodyBuilder(), new StatusMapper());
    }

    /**
     * @param array<string, mixed>|null $answer null = the client throws
     */
    private function client(?array $answer): RemoteServiceClient
    {
        return new class ($answer) implements RemoteServiceClient {
            /** @var list<array{string, string, array<string, mixed>}> */
            public array $calls = [];

            /** @param array<string, mixed>|null $answer */
            public function __construct(private readonly ?array $answer)
            {
            }

            public function send(string $path, string $httpMethod, array $body): array
            {
                $this->calls[] = [$path, $httpMethod, $body];

                return $this->answer ?? throw new RuntimeException('unreachable');
            }
        };
    }
}
