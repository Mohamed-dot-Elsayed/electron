export interface LabelProduct {
  productId: string;
  productPriceId: string;
  quantity: number;
}

export interface LabelConfig {
  showProductName: boolean;
  showPrice: boolean;
  showPromotionalPrice: boolean;
  showBusinessName: boolean;
  showBrand: boolean;
  showBarcode: boolean;
  productNameSize?: number;
  priceSize?: number;
  promotionalPriceSize?: number;
  businessNameSize?: number;
  brandSize?: number;
  // useRectangularLayout?: boolean;
}

export interface PaperConfig {
  labelsPerSheet: number;
  sheetWidth: number;
  sheetHeight: number;
  labelWidth: number;
  labelHeight: number;
  columns: number;
  rows: number;
  marginTop: number;
  marginLeft: number;
  gapX: number;
  gapY: number;
}

export interface LabelSize {
  id: string;
  name: string;
  description: string;
  paperType: string;
  labelsPerSheet: number;
  labelSize: string;
  recommended: boolean;
  useCase: string;
  // useRectangularLayout: boolean;
}

export interface GenerateLabelsRequest {
  products: LabelProduct[];
  labelConfig: Partial<LabelConfig>;
  paperSize: string;
}

export interface LabelData {
  productName: string;
  brandName: string;
  businessName: string;
  price: number;
  promotionalPrice?: number;
  barcode: string;
}
