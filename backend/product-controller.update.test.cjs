describe("ProductController update field safety", () => {
  let ProductController;
  let Product;

  beforeAll(async () => {
    const controllerModule =
      await import("./src/controllers/ProductController.js");
    const modelModule = await import("./src/models/Product.js");
    ProductController = controllerModule.ProductController;
    Product = modelModule.Product;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("does not overwrite booleans when omitted", async () => {
    const controller = new ProductController();

    const productDocument = {
      _id: "p1",
      title: "Old Title",
      summary: "Old Summary",
      description: "Old Description",
      condition: "new",
      status: "active",
      isFeatured: true,
      hasVariants: false,
      basePrice: 25,
      baseDiscount: 2,
      baseStock: 10,
      baseSku: "OLD-SKU",
      size: ["M"],
      variants: [],
      images: [],
      category: { id: "c1", title: "Cat", slug: "cat" },
      childCategory: null,
      brand: { id: "b1", title: "Brand", slug: "brand" },
      tags: ["old"],
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Product, "findById").mockResolvedValue(productDocument);

    const request = {
      params: { id: "p1" },
      body: {
        title: "Updated Title",
      },
      files: [],
    };

    const response = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await controller.update(request, response);

    expect(productDocument.isFeatured).toBe(true);
    expect(productDocument.hasVariants).toBe(false);
    expect(productDocument.title).toBe("Updated Title");
    expect(productDocument.save).toHaveBeenCalled();
  });

  test("allows numeric fields to be updated to zero", async () => {
    const controller = new ProductController();

    const productDocument = {
      _id: "p2",
      title: "Zero Case",
      summary: "Summary",
      description: "Description",
      condition: "new",
      status: "active",
      isFeatured: false,
      hasVariants: false,
      basePrice: 100,
      baseDiscount: 15,
      baseStock: 20,
      baseSku: "SKU-100",
      size: [],
      variants: [],
      images: [],
      category: { id: "c1", title: "Cat", slug: "cat" },
      childCategory: null,
      brand: { id: "b1", title: "Brand", slug: "brand" },
      tags: [],
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Product, "findById").mockResolvedValue(productDocument);

    const request = {
      params: { id: "p2" },
      body: {
        hasVariants: "false",
        basePrice: "0",
        baseDiscount: "0",
        baseStock: "0",
      },
      files: [],
    };

    const response = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await controller.update(request, response);

    expect(productDocument.basePrice).toBe(0);
    expect(productDocument.baseDiscount).toBe(0);
    expect(productDocument.baseStock).toBe(0);
    expect(productDocument.hasVariants).toBe(false);
    expect(productDocument.save).toHaveBeenCalled();
  });
});
