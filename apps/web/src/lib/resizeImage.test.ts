import { afterEach, describe, expect, it, vi } from "vitest";
import { resizeImage } from "./resizeImage";

function stubBrowser(width: number, height: number) {
  const close = vi.fn();
  const drawImage = vi.fn();
  const createImageBitmap = vi.fn(async () => ({ width, height, close }));
  vi.stubGlobal("createImageBitmap", createImageBitmap);
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage }),
    toBlob: (cb: (b: Blob | null) => void, type: string) => cb(new Blob(["x"], { type })),
  };
  const original = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) =>
    tag === "canvas" ? (canvas as unknown as HTMLCanvasElement) : original(tag),
  );
  return { canvas, close, drawImage, createImageBitmap };
}

afterEach(() => vi.restoreAllMocks());

describe("resizeImage", () => {
  it("verkleinert auf 1600 px lange Kante und kodiert als JPEG", async () => {
    const { canvas, close, createImageBitmap } = stubBrowser(4000, 3000);

    const blob = await resizeImage(new Blob(["foto"]));

    expect([canvas.width, canvas.height]).toEqual([1600, 1200]);
    expect(blob.type).toBe("image/jpeg");
    expect(createImageBitmap).toHaveBeenCalledWith(expect.any(Blob), { imageOrientation: "from-image" });
    expect(close).toHaveBeenCalled();
  });

  it("vergrößert kleine Fotos nicht", async () => {
    const { canvas } = stubBrowser(800, 600);

    await resizeImage(new Blob(["foto"]));

    expect([canvas.width, canvas.height]).toEqual([800, 600]);
  });

  it("berücksichtigt Hochformat", async () => {
    const { canvas } = stubBrowser(3000, 4000);

    await resizeImage(new Blob(["foto"]));

    expect([canvas.width, canvas.height]).toEqual([1200, 1600]);
  });
});
