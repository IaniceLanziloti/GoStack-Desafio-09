import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {
    //
  }

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found.');
    }

    const productsFound = await this.productsRepository.findAllById(products);

    if (productsFound.length !== products.length) {
      throw new AppError('This order have invalid products');
    }

    const insufficientQuantity = productsFound.filter(product => {
      const productSoldIndex = products.findIndex(p => p.id === product.id);
      //
      const quantitySold = products[productSoldIndex].quantity;

      return quantitySold > product.quantity;
    });

    if (insufficientQuantity.length) {
      throw new AppError(
        'This order have products with insufficient quantity.',
      );
    }

    const productsSold = productsFound.map(found => {
      const productFound = products.find(product => product.id === found.id);

      return {
        product_id: productFound?.id || '',
        quantity: productFound?.quantity || 0,
        price: found.price,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsSold,
    });

    await this.productsRepository.updateQuantity(products);
    return order;
  }
}

export default CreateOrderService;
