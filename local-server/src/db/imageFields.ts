export type ImageFieldType = "single" | "array";

export interface ImageFieldDef {
  field: string;
  type: ImageFieldType;
}

// The one place to touch when a new image column is added.
export const imageFieldsRegistry: Record<string, ImageFieldDef[]> = {
  Product: [
    { field: "image", type: "single" },
    { field: "gallery_product", type: "array" },
  ],
  Brand: [{field:"logo",type:"single"}],
  Category: [{field:"image",type:"single"}],
  Customer: [{field:"imagePath",type:"single"}],
  BankAccount: [{field:"image",type:"single"}],
  Order: [{field:"proofImage",type:"single"}],
  Pandel: [{field:"images",type:"array"}],
  Payment: [{field:"payment_proof",type:"single"}],
  PaymentMethod: [{field:"icon",type:"single"}],
  ProductPrice:[{field:"gallery",type:"array"}],
  Return: [{field:"image",type:"single"}],
  User: [{field:"image_url",type:"single"}]
};

export function getImageFieldsForTable(table: string): ImageFieldDef[] {
  return imageFieldsRegistry[table] ?? [];
}