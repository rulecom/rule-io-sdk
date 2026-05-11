/**
 * Recipients namespace client.
 *
 * Has no endpoints of its own — instead it exposes three nested namespaces
 * (`segments`, `subscribers`, `tags`) corresponding to the
 * `/editor/recipients/*` endpoint family. Each nested client is constructed
 * lazily on first access and cached, so
 * `client.recipients.segments === client.recipients.segments` is invariant.
 */

import { BaseResource } from '../../core/base-resource.js';

import { RecipientSubscribersClient } from './subscribers/recipient-subscribers.client.js';
import { RecipientTagsClient } from './tags/recipient-tags.client.js';
import { SegmentsClient } from './segments/segments.client.js';

export class RecipientsClient extends BaseResource {
  get segments(): SegmentsClient {
    return this.lazy('segments', () => new SegmentsClient(this.transport));
  }

  get subscribers(): RecipientSubscribersClient {
    return this.lazy(
      'subscribers',
      () => new RecipientSubscribersClient(this.transport)
    );
  }

  get tags(): RecipientTagsClient {
    return this.lazy('tags', () => new RecipientTagsClient(this.transport));
  }
}
