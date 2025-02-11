import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { NavigationExtras, Router } from '@angular/router';
import { loadStripe, Stripe, StripeCardCvcElement, StripeCardExpiryElement, StripeCardNumberElement } from '@stripe/stripe-js';
import { ToastrService } from 'ngx-toastr';
import { BasketService } from 'src/app/basket/basket.service';
import { IAddress } from 'src/app/models/address';
import { IBasket } from 'src/app/models/basket';
import { OrderToCreate } from 'src/app/models/order';
import { CheckoutService } from '../checkout.service';

@Component({
  selector: 'app-checkout-payment',
  templateUrl: './checkout-payment.component.html',
  styleUrls: ['./checkout-payment.component.scss']
})
export class CheckoutPaymentComponent implements OnInit{
  @Input() checkoutForm: FormGroup;
  @ViewChild('cardNumber') cardNumberElement?: ElementRef;
  @ViewChild('cardExpiry') cardExpiryElement?: ElementRef;
  @ViewChild('cardCvc') cardCvcElement?: ElementRef;
  stripe: Stripe | null = null;
  cardNumber?: StripeCardNumberElement;
  cardExpiry?: StripeCardExpiryElement;
  cardCvc?: StripeCardCvcElement;
  cardNumberComplete = false;
  cardExpiryComplete = false;
  cardCvcComplete = false;
  cardErrors: any;
  loading = false;

  constructor(private basketService: BasketService, private checkoutService: CheckoutService, 
    private toastrService: ToastrService, private router: Router) {}
  
  ngOnInit(): void {
    loadStripe('pk_test_51Ml9jFLpFiF4XMgA3arC3mLm49g3f256dFPJX5cn1b2YAXaQsacbkEJWCIYjRsik3WiZpiKW7MYKlCuD21CmXc7W00r5yzJoAM')
      .then(stripe => {
        this.stripe = stripe;
        const elements = stripe?.elements();
        if (elements) {
          this.cardNumber = elements.create('cardNumber');
          this.cardNumber.mount(this.cardNumberElement?.nativeElement);
          this.cardNumber.on('change', event => {
            this.cardNumberComplete = event.complete;
            this.cardErrors = event.error ? event.error.message : null;
          })

          this.cardExpiry = elements.create('cardExpiry');
          this.cardExpiry.mount(this.cardExpiryElement?.nativeElement);
          this.cardExpiry.on('change', event => {
            this.cardExpiryComplete = event.complete;
            this.cardErrors = event.error ? event.error.message : null;
          })

          this.cardCvc = elements.create('cardCvc');
          this.cardCvc.mount(this.cardCvcElement?.nativeElement);
          this.cardCvc.on('change', event => {
            this.cardCvcComplete = event.complete;
            this.cardErrors = event.error ? event.error.message : null;
          });
        }
      });
  }

  get paymentFormComplete() {
    return this.checkoutForm?.get('paymentForm')?.valid
      && this.cardNumberComplete
      && this.cardExpiryComplete
      && this.cardCvcComplete;
  }

  async submitOrder() {
    this.loading = true;
    const basket = this.basketService.getCurrentBasket();
    try {
      const createdOrder = await this.createOrder(basket);
      const paymentResult = await this.confirmPaymentStripe(basket);

      if (paymentResult.paymentIntent) {
        this.basketService.deleteBasket(basket.id);
        const navigationExtras: NavigationExtras = {state: createdOrder};
        this.router.navigate(['checkout/success'], navigationExtras);
      } else {
        this.toastrService.error(paymentResult.error.message);
      }
    } catch (error: any) {
      this.toastrService.error(error.message);
    } finally {
      this.loading = false;
    }
  }

  private async confirmPaymentStripe(basket: IBasket) {
    if (!basket) throw new Error('Basket is null');
    const result = this.stripe?.confirmCardPayment(basket.clientSecret!, {
      payment_method: {
        card: this.cardNumber!,
        billing_details: {
          name: this.checkoutForm?.get('paymentForm')?.get('nameOnCard')?.value
        }
      }
    });
    if (!result) throw new Error('Problem attempting payment with stripe');

    return result;
  }

  private async createOrder(basket: IBasket) {
    if (!basket) throw new Error('Basket is null');

    const orderToCreate = this.getOrderToCreate(basket);
    return this.checkoutService.createOrder(orderToCreate).toPromise();
  }

  private getOrderToCreate(basket: IBasket) : OrderToCreate {
    const deliveryMethodId = this.checkoutForm?.get('deliveryForm')?.get('deliveryMethod')?.value;
    const shipToAddress = this.checkoutForm?.get('addressForm')?.value as IAddress;
    if (!deliveryMethodId || !shipToAddress) throw new Error('Problem with basket');

    return {
      basketId: basket.id,
      deliveryMethodId,
      shipToAddress
    };
  }
}
