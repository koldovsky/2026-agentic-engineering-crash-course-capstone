<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

/** module.service.md §9.1: what the emulated service answers and which callbacks follow, in order. */
enum Scenario: string
{
    case SendedAtOnce = 'sended-at-once';
    case SendingThenSended = 'sending-then-sended';
    case SendingThenFail = 'sending-then-fail';
    case SendingSendingSended = 'sending-sending-sended';
    case FailAtOnce = 'fail-at-once';
    case UnmappedValue = 'unmapped-value';

    public function responseStatus(): RemoteStatus
    {
        return match ($this) {
            self::SendedAtOnce => RemoteStatus::Sended,
            self::SendingThenSended, self::SendingThenFail, self::SendingSendingSended => RemoteStatus::Sending,
            self::FailAtOnce => RemoteStatus::Fail,
            self::UnmappedValue => RemoteStatus::Unknown,
        };
    }

    /** @return list<RemoteStatus> */
    public function callbackStatuses(): array
    {
        return match ($this) {
            self::SendingThenSended => [RemoteStatus::Sended],
            self::SendingThenFail => [RemoteStatus::Fail],
            self::SendingSendingSended => [RemoteStatus::Sending, RemoteStatus::Sended],
            default => [],
        };
    }
}
