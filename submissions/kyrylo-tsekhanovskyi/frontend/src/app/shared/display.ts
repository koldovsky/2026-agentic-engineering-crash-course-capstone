import { Pipe, PipeTransform } from '@angular/core';

/** CSS class of a status or fit chip, e.g. ('NotResponding', 'listing') → "listing-not-responding". */
@Pipe({ name: 'chipClass' })
export class ChipClassPipe implements PipeTransform {
  transform(value: string, prefix: 'status' | 'listing' | 'fit'): string {
    return `${prefix}-${value.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
  }
}

/** Human label of an enum value, e.g. "NotResponding" → "Not responding", "WrongItem" → "Wrong item". */
export function humanLabel(value: string): string {
  const words = value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

@Pipe({ name: 'label' })
export class LabelPipe implements PipeTransform {
  transform(value: string): string {
    return humanLabel(value);
  }
}

/** A distinct chip tone per item status (styled with theme tokens in styles.scss). */
const ITEM_TONES: Record<string, string> = {
  Needed: 'outline',
  Sourcing: 'tertiary',
  Ordered: 'secondary-strong',
  Received: 'primary-strong',
};

@Pipe({ name: 'itemTone' })
export class ItemTonePipe implements PipeTransform {
  transform(status: string): string {
    return ITEM_TONES[status] ?? 'outline';
  }
}

/** "1 item", "2 items". */
@Pipe({ name: 'plural' })
export class PluralPipe implements PipeTransform {
  transform(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }
}

/** Host name of a URL without "www.", e.g. "olx.ua"; the raw text when it is not a URL. */
@Pipe({ name: 'host' })
export class HostPipe implements PipeTransform {
  transform(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
}
