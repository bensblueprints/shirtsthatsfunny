<?php
/**
 * Plugin Name: Shirt That's Funny — headless bridge
 * Description: CORS for the Store API, a flattened variation matrix endpoint,
 *              and front-end redirects so nobody ever sees a WordPress theme.
 */

defined( 'ABSPATH' ) || exit;

function stf_web_url() {
	return untrailingslashit( defined( 'STF_WEB_URL' ) ? STF_WEB_URL : home_url() );
}

/* ── CORS ──────────────────────────────────────────────────────────────────
 * The Store API hands the cart identity back in a Cart-Token response header.
 * Browsers can't read it unless we expose it explicitly, and our Next.js
 * proxy can't send it back unless it's on the allowed list.
 */
add_action( 'rest_api_init', function () {
	remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );

	add_filter( 'rest_pre_serve_request', function ( $served ) {
		$origin  = get_http_origin();
		$allowed = array_filter( [ stf_web_url(), 'http://localhost:3000' ] );

		if ( $origin && in_array( untrailingslashit( $origin ), $allowed, true ) ) {
			header( 'Access-Control-Allow-Origin: ' . untrailingslashit( $origin ) );
			header( 'Access-Control-Allow-Credentials: true' );
			header( 'Vary: Origin', false );
		}

		header( 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Authorization, Content-Type, Nonce, Cart-Token, X-WP-Nonce' );
		header( 'Access-Control-Expose-Headers: Cart-Token, Nonce, X-WP-Total, X-WP-TotalPages, Link' );

		return $served;
	}, 15 );
}, 15 );

/* Answer preflight before WordPress bothers to route it. */
add_action( 'init', function () {
	if ( 'OPTIONS' === ( $_SERVER['REQUEST_METHOD'] ?? '' ) && str_contains( $_SERVER['REQUEST_URI'] ?? '', '/wp-json/' ) ) {
		status_header( 200 );
		exit;
	}
}, 1 );

/* ── Headless front end ────────────────────────────────────────────────────
 * Anything that isn't admin, REST, cron or login gets bounced to Next.js.
 */
add_action( 'template_redirect', function () {
	if ( is_admin() || wp_doing_ajax() || wp_doing_cron() ) {
		return;
	}
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return;
	}

	$path = wp_parse_url( $_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH ) ?: '/';
	$target = stf_web_url();

	// Keep product and page URLs meaningful when a link leaks out.
	if ( is_singular( 'product' ) ) {
		$target .= '/product/' . get_post_field( 'post_name', get_queried_object_id() );
	} elseif ( is_post_type_archive( 'product' ) || is_tax( 'product_cat' ) ) {
		$target .= '/shop';
	} elseif ( is_page() ) {
		$target .= '/pages/' . get_post_field( 'post_name', get_queried_object_id() );
	}

	wp_safe_redirect( $target, 302 );
	exit;
}, 0 );

add_filter( 'allowed_redirect_hosts', function ( $hosts ) {
	$host = wp_parse_url( stf_web_url(), PHP_URL_HOST );
	if ( $host ) {
		$hosts[] = $host;
	}
	return $hosts;
} );

/* ── Variation matrix ──────────────────────────────────────────────────────
 * One request gives the storefront everything a product page needs: the
 * colour/size axes plus a lookup of every colour|size combination. Saves the
 * PDP from fanning out to /products/<id>/variations and stitching it together.
 */
add_action( 'rest_api_init', function () {
	register_rest_route( 'stf/v1', '/product/(?P<slug>[a-z0-9-]+)', [
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function ( $request ) {
			$posts = get_posts( [
				'name'        => $request['slug'],
				'post_type'   => 'product',
				'post_status' => 'publish',
				'numberposts' => 1,
			] );

			if ( empty( $posts ) ) {
				return new WP_Error( 'stf_not_found', 'No such shirt.', [ 'status' => 404 ] );
			}

			$product = wc_get_product( $posts[0]->ID );
			if ( ! $product ) {
				return new WP_Error( 'stf_not_found', 'No such shirt.', [ 'status' => 404 ] );
			}

			$axes = [];
			foreach ( $product->get_variation_attributes() as $taxonomy => $values ) {
				$axes[ sanitize_title( str_replace( 'pa_', '', $taxonomy ) ) ] = array_values( $values );
			}

			$matrix = [];
			if ( $product->is_type( 'variable' ) ) {
				foreach ( $product->get_available_variations() as $variation ) {
					$colour = $variation['attributes']['attribute_pa_color'] ?? '';
					$size   = $variation['attributes']['attribute_pa_size'] ?? '';
					$object = wc_get_product( $variation['variation_id'] );

					$matrix[ $colour . '|' . $size ] = [
						'id'            => $variation['variation_id'],
						'price'         => (float) $object->get_price(),
						'regular_price' => (float) $object->get_regular_price(),
						'in_stock'      => (bool) $variation['is_in_stock'],
						'sku'           => $object->get_sku(),
					];
				}
			}

			return [
				'id'          => $product->get_id(),
				'slug'        => $product->get_slug(),
				'name'        => $product->get_name(),
				'description' => wp_strip_all_tags( $product->get_description() ),
				'short'       => wp_strip_all_tags( $product->get_short_description() ),
				'price_min'   => (float) $product->get_variation_price( 'min' ),
				'price_max'   => (float) $product->get_variation_price( 'max' ),
				'slogan'      => get_post_meta( $product->get_id(), '_stf_slogan', true ) ?: $product->get_name(),
				'axes'        => $axes,
				'variations'  => $matrix,
				'categories'  => wp_get_post_terms( $product->get_id(), 'product_cat', [ 'fields' => 'names' ] ),
				'image'       => wp_get_attachment_url( $product->get_image_id() ) ?: null,
				'rating'      => (float) $product->get_average_rating(),
				'review_count'=> (int) $product->get_review_count(),
			];
		},
	] );
} );

/* Keep sizes in wearing order everywhere, not alphabetical. */
add_filter( 'woocommerce_get_product_terms', function ( $terms, $product_id, $taxonomy ) {
	if ( 'pa_size' !== $taxonomy ) {
		return $terms;
	}
	$order = [ 's' => 0, 'm' => 1, 'l' => 2, 'xl' => 3, '2xl' => 4, '3xl' => 5 ];
	usort( $terms, function ( $a, $b ) use ( $order ) {
		return ( $order[ $a->slug ] ?? 99 ) <=> ( $order[ $b->slug ] ?? 99 );
	} );
	return $terms;
}, 10, 3 );

/* Mailpit in dev. Swap for your transactional provider in production. */
add_action( 'phpmailer_init', function ( $mailer ) {
	if ( defined( 'WP_ENV' ) && 'production' === WP_ENV ) {
		return;
	}
	$mailer->isSMTP();
	$mailer->Host       = 'mail';
	$mailer->Port       = 1025;
	$mailer->SMTPAuth   = false;
	$mailer->SMTPAutoTLS = false;
} );

/* A headless store has no use for these. */
add_filter( 'woocommerce_enqueue_styles', '__return_empty_array' );
add_action( 'init', function () {
	remove_action( 'wp_head', 'wp_generator' );
} );
