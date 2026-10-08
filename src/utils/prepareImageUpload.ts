const readDataUrl = (file: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('อ่านไฟล์รูปภาพไม่สำเร็จ'));
  reader.readAsDataURL(file);
});

// Preserve small files and animated formats; keep the user's original file untouched.
export async function prepareImageUpload(file: File): Promise<string> {
  if (file.size <= 512 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return readDataUrl(file);
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('เตรียมรูปภาพไม่สำเร็จ');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .88));
    return readDataUrl(compressed && compressed.size < file.size ? compressed : file);
  } finally { bitmap.close(); }
}
