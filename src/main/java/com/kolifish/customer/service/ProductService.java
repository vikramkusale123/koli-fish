
package com.kolifish.customer.service;

import com.kolifish.customer.entity.Product;
import com.kolifish.customer.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductService {

    private static final double LOW_STOCK_LIMIT = 5.0;

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional
    public Product createProduct(Product product) {
        validateProduct(product);
        return productRepository.save(product);
    }

    @Transactional(readOnly = true)
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
    }

    @Transactional
    public Product updateProduct(Long id, Product productDetails) {
        if (productDetails == null) {
            throw new RuntimeException("Product details are required");
        }

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        validateProduct(productDetails);

        product.setName(productDetails.getName());
        product.setCategory(productDetails.getCategory());
        product.setPrice(productDetails.getPrice());
        product.setUnit(productDetails.getUnit());
        product.setStockQuantity(productDetails.getStockQuantity());
        product.setActive(productDetails.getActive());

        return productRepository.save(product);
    }

    @Transactional(readOnly = true)
    public List<Product> getStockAlerts() {
        return productRepository.findAll().stream()
                .filter(product ->
                        product.getStockQuantity() == null
                                || product.getStockQuantity() <= LOW_STOCK_LIMIT)
                .toList();
    }

    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Product not found");
        }

        productRepository.deleteById(id);
    }

    private void validateProduct(Product product) {
        if (product == null) {
            throw new RuntimeException("Product details are required");
        }

        if (product.getName() == null || product.getName().isBlank()) {
            throw new RuntimeException("Product name is required");
        }

        if (product.getPrice() == null || product.getPrice() < 0) {
            throw new RuntimeException("Product price cannot be negative");
        }

        if (product.getStockQuantity() != null
                && product.getStockQuantity() < 0) {
            throw new RuntimeException("Stock quantity cannot be negative");
        }

        if (product.getUnit() == null || product.getUnit().isBlank()) {
            throw new RuntimeException("Product unit is required");
        }
    }
}
