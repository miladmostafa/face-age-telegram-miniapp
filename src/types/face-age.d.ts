/** Public surface used by this Mini App. Matches the face-age README and the published bundle. */
declare module "face-age" {
  export interface FaceAgeProductVariableOption {
    label: string;
    value: string;
    price?: number;
    offerPrice?: number;
  }

  export interface FaceAgeProduct {
    id: string | number;
    url: string;
    image: string;
    title: string;
    description?: string;
    price: number;
    offerPrice?: number;
    problems?: string[];
    routineGroups?: Record<string, string[]> | string[];
    variables?: Record<
      string,
      {
        title: string;
        option: FaceAgeProductVariableOption[];
      }
    >;
  }

  export interface FaceAgeOptions {
    elementId: string;
    faceageId: string;
    displayModel?: "widget" | "section" | "modal";
    language?: string;
    height?: string;
    width?: string;
    currency?: string;
    quiz?: boolean;
    showProducts?: boolean;
    showRoutine?: boolean;
    showAddToCard?: boolean;
    showAddToCardAll?: boolean;
    showCamera?: boolean;
    showUpload?: boolean;
    privacyUrl?: string;
    problems?: string[];
  }

  export interface FaceAgeCartLine {
    id: string | number;
    variable?: unknown;
  }

  export interface FaceAgeAdvisorData {
    analysis: unknown;
    activeSelections?: unknown;
  }

  export interface FaceAgeApi {
    setCustomProducts(products: FaceAgeProduct[]): void;
    getAdvisorData(callback: (data: FaceAgeAdvisorData) => void): Promise<unknown>;
  }

  export default class FaceAge {
    API: FaceAgeApi;
    constructor(options: FaceAgeOptions);
    render(): void;
    onAddToCart(callback: (data: FaceAgeCartLine[]) => void): Promise<unknown>;
    onCheckout(callback: (data: FaceAgeCartLine[]) => void): Promise<unknown>;
  }
}
