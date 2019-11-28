/* eslint-disable strict, no-var */
/* global jQuery, Stripe, wcpay_config */
jQuery( function( $ ) {
	'use strict';

	/* eslint-disable-next-line camelcase */
	var stripe = new Stripe( wcpay_config.publishableKey, {
		/* eslint-disable-next-line camelcase */
		stripeAccount: wcpay_config.accountId,
	} );
	var elements = stripe.elements();

	// Create a card element.
	var cardElement = elements.create( 'card', {
		hidePostalCode: true,
		classes: { base: 'wcpay-card-mounted' },
	} );

	// Only attempt to mount the card element once that section of the page has loaded. We can use the updated_checkout
	// event for this. This part of the page can also reload based on changes to checkout details, so we call unmount
	// first to ensure the card element is re-mounted correctly.
	$( document.body ).on( 'updated_checkout', function() {
		// Don't re-mount if already mounted in DOM.
		if ( $( '#wcpay-card-element' ).children().length ) {
			return;
		}

		cardElement.unmount();
		cardElement.mount( '#wcpay-card-element' );
	} );

	if ( $( 'form#add_payment_method' ).length || $( 'form#order_review' ).length ) {
		cardElement.mount( '#wcpay-card-element' );
	}

	// Update the validation state based on the element's state.
	cardElement.addEventListener( 'change', function( event ) {
		var displayError = jQuery( '#wcpay-errors' );
		if ( event.error ) {
			displayError.html( '<ul class="woocommerce-error"><li /></ul>' )
				.find( 'li' ).text( event.error.message );
		} else {
			displayError.empty();
		}
	} );

	// Create payment method on submission.
	var paymentMethodGenerated;
	$( 'form.checkout' ).on( 'checkout_place_order_woocommerce_payments', function() {
		// We'll resubmit the form after populating our payment method, so if this is the second time this event
		// is firing we should let the form submission happen.
		if ( paymentMethodGenerated ) {
			return;
		}

		stripe.createPaymentMethod( 'card', cardElement )
			.then( function( result ) {
				var paymentMethod = result.paymentMethod;
				var error = result.error;

				if ( error ) {
					throw error;
				}

				return paymentMethod;
			} )
			.then( function( paymentMethod ) {
				var id = paymentMethod.id;

				// Flag that the payment method has been successfully generated so that we can allow the form
				// submission next time.
				paymentMethodGenerated = true;

				// Populate form with the payment method.
				var paymentMethodInput = document.getElementById( 'wcpay-payment-method' );
				paymentMethodInput.value = id;

				// Re-submit the form.
				$( '.woocommerce-checkout' ).submit();
			} );

		// Prevent form submission so that we can fire it once a payment method has been generated.
		return false;
	} );
} );
