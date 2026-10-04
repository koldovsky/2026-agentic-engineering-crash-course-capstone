<?php

declare(strict_types=1);

namespace app\modules\mail_service\controllers;

use app\controllers\BaseController;
use app\domain\process\ExternalId;
use app\domain\process\Process;
use app\modules\mail_service\application\ReadCallback;
use app\modules\mail_service\application\SendMail;

/** The init and callback endpoints of the mail service (`/mail_service/v1/...`). */
final class V1Controller extends BaseController
{
    /**
     * @param array<string, mixed> $config
     */
    public function __construct(
        $id,
        $module,
        private readonly SendMail $sendMail,
        private readonly ReadCallback $readCallback,
        $config = [],
    ) {
        parent::__construct($id, $module, $config);
    }

    protected function doProcess(string $type, Process $process, array $data): array
    {
        // callback: the host already applied the status (getCallbackStatus()); nothing to answer
        if ($type !== 'init') {
            return [];
        }

        $result = $this->sendMail->execute($process->requestId()->value, $process->serviceMethod()->value, $data);
        $process->assignExternalId(new ExternalId($result['externalId']));
        $process->changeStatus($result['status']);

        return [];
    }

    protected function getExternalId(array $data): string
    {
        return $this->readCallback->externalId($data);
    }

    protected function getCallbackStatus(array $data): string
    {
        return $this->readCallback->status($data)->value;
    }
}
