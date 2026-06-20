# Screenshots — capture checklist

These are **not yet captured**. Run the [mobile golden
client](../../apps/expo-reference) on a real device or simulator (see the
[quickstart](../QUICKSTART.md)) and save each shot here with the exact filename
below, then add an image gallery to the root `README.md`.

> Do not commit placeholder/blank images, and do not add `![](...)` links to the
> README until the real files exist — broken images on the front page hurt more
> than missing ones.

| Filename | Screen | What it should show |
| --- | --- | --- |
| `home.png` | `app/index.tsx` | Sandbox environment pill + key pill (and an offline-queued count if any) |
| `create-order.png` | `app/create.tsx` | The create form with amount/currency and the typed outcome card |
| `detail.png` | `app/order/[id].tsx` | An order read back by id |
| `offline-queue.png` | home, airplane mode | The `N order(s) queued offline` banner |

Suggested device frame: a single phone (iPhone or Pixel) at default resolution,
light mode, so the set looks consistent.

Once captured, add to the root README under **Reference applications**:

```markdown
| Sandbox health | Create order | Order detail | Offline queue |
| --- | --- | --- | --- |
| ![](docs/screenshots/home.png) | ![](docs/screenshots/create-order.png) | ![](docs/screenshots/detail.png) | ![](docs/screenshots/offline-queue.png) |
```
