<?php
/**
 * Seeds the whole store: attributes, catalogue, shipping, payments, pages,
 * coupons and the REST key Next.js reads the catalogue with.
 * Idempotent — re-running updates rather than duplicates.
 */

defined( 'ABSPATH' ) || exit;

WP_CLI::line( '  - attributes' );

/**
 * Global attributes have to exist as taxonomies before we can attach terms in
 * the same request, so register them by hand after creating them.
 */
function stf_attribute( $label, $slug, $terms ) {
	$taxonomy = 'pa_' . $slug;
	$existing = wc_attribute_taxonomy_id_by_name( $slug );

	if ( ! $existing ) {
		$existing = wc_create_attribute( array(
			'name'         => $label,
			'slug'         => $slug,
			'type'         => 'select',
			'order_by'     => 'menu_order',
			'has_archives' => false,
		) );
		if ( is_wp_error( $existing ) ) {
			WP_CLI::error( $existing->get_error_message() );
		}
	}

	if ( ! taxonomy_exists( $taxonomy ) ) {
		register_taxonomy( $taxonomy, array( 'product' ), array( 'hierarchical' => false, 'show_ui' => false ) );
	}

	$ids = array();
	foreach ( $terms as $order => $term ) {
		$found = get_term_by( 'slug', $term['slug'], $taxonomy );
		if ( ! $found ) {
			$new = wp_insert_term( $term['name'], $taxonomy, array( 'slug' => $term['slug'] ) );
			if ( is_wp_error( $new ) ) {
				continue;
			}
			$found = get_term( $new['term_id'], $taxonomy );
		}
		update_term_meta( $found->term_id, 'order_' . $taxonomy, $order );
		$ids[ $term['slug'] ] = $found->term_id;
	}

	return array( 'id' => (int) $existing, 'taxonomy' => $taxonomy, 'terms' => $ids );
}

$colour = stf_attribute( 'Color', 'color', array(
	array( 'name' => 'Black', 'slug' => 'black' ),
	array( 'name' => 'White', 'slug' => 'white' ),
) );

$size = stf_attribute( 'Size', 'size', array(
	array( 'name' => 'S',   'slug' => 's' ),
	array( 'name' => 'M',   'slug' => 'm' ),
	array( 'name' => 'L',   'slug' => 'l' ),
	array( 'name' => 'XL',  'slug' => 'xl' ),
	array( 'name' => '2XL', 'slug' => '2xl' ),
	array( 'name' => '3XL', 'slug' => '3xl' ),
) );

// Bigger sizes cost more to blank-source; this mirrors real garment pricing.
$size_upcharge = array( 's' => 0, 'm' => 0, 'l' => 0, 'xl' => 0, '2xl' => 2, '3xl' => 4 );

WP_CLI::line( '  - categories' );
$categories = array(
	'best-sellers' => 'Best Sellers',
	'new-in'       => 'New In',
	'deadpan'      => 'Deadpan',
	'low-effort'   => 'Low Effort',
);
foreach ( $categories as $cat_slug => $cat_name ) {
	if ( ! term_exists( $cat_slug, 'product_cat' ) ) {
		wp_insert_term( $cat_name, 'product_cat', array( 'slug' => $cat_slug ) );
	}
}

WP_CLI::line( '  - products' );

$catalogue = array(
	array( 'slogan' => 'I Paused My Game For This',              'price' => 28, 'cats' => array( 'best-sellers', 'deadpan' ) ),
	array( 'slogan' => 'This Is My Formal T-Shirt',              'price' => 28, 'cats' => array( 'best-sellers' ) ),
	array( 'slogan' => 'I Have No Idea What I Am Doing',         'price' => 28, 'cats' => array( 'deadpan' ) ),
	array( 'slogan' => 'Sorry I Am Late, I Did Not Want To Come','price' => 30, 'cats' => array( 'best-sellers', 'deadpan' ) ),
	array( 'slogan' => 'Currently Avoiding Responsibility',      'price' => 28, 'cats' => array( 'low-effort' ) ),
	array( 'slogan' => 'Ask Me About My Silence',                'price' => 28, 'cats' => array( 'deadpan' ) ),
	array( 'slogan' => 'Powered By Snacks And Spite',            'price' => 30, 'cats' => array( 'new-in' ) ),
	array( 'slogan' => 'I Am Not Arguing, I Am Explaining Loudly','price' => 30, 'cats' => array( 'best-sellers' ) ),
	array( 'slogan' => 'Certified Overthinker',                  'price' => 28, 'cats' => array( 'new-in', 'deadpan' ) ),
	array( 'slogan' => 'I Came Here To Sit Down',                'price' => 28, 'cats' => array( 'low-effort' ) ),
	array( 'slogan' => 'My Other Shirt Is Also This Shirt',      'price' => 32, 'cats' => array( 'new-in' ) ),
	array( 'slogan' => 'Not A Morning Person, Just Tired',       'price' => 28, 'cats' => array( 'low-effort', 'deadpan' ) ),
);

$blurb = 'Screen-printed on a 5.3oz ring-spun cotton tee. Water-based ink, so the print stays soft instead of sitting on top of the shirt like a sticker. Pre-shrunk, side-seamed, and it survives a hot wash.';

$made = 0;

foreach ( $catalogue as $index => $item ) {
	$number = str_pad( $index + 1, 2, '0', STR_PAD_LEFT );
	$slug   = sanitize_title( $item['slogan'] );

	$existing = get_posts( array( 'name' => $slug, 'post_type' => 'product', 'post_status' => 'any', 'numberposts' => 1 ) );
	$product  = $existing ? new WC_Product_Variable( $existing[0]->ID ) : new WC_Product_Variable();

	$product->set_name( $item['slogan'] );
	$product->set_slug( $slug );
	$product->set_status( 'publish' );
	$product->set_catalog_visibility( 'visible' );
	$product->set_description( $blurb );
	$product->set_short_description( 'Unisex fit. Black or white. S through 3XL.' );
	$product->set_reviews_allowed( true );
	$product->set_sold_individually( false );
	$product->set_weight( '0.4' );
	$product->set_length( '10' );
	$product->set_width( '8' );
	$product->set_height( '1' );

	$colour_attr = new WC_Product_Attribute();
	$colour_attr->set_id( $colour['id'] );
	$colour_attr->set_name( $colour['taxonomy'] );
	$colour_attr->set_options( array_values( $colour['terms'] ) );
	$colour_attr->set_position( 0 );
	$colour_attr->set_visible( true );
	$colour_attr->set_variation( true );

	$size_attr = new WC_Product_Attribute();
	$size_attr->set_id( $size['id'] );
	$size_attr->set_name( $size['taxonomy'] );
	$size_attr->set_options( array_values( $size['terms'] ) );
	$size_attr->set_position( 1 );
	$size_attr->set_visible( true );
	$size_attr->set_variation( true );

	$product->set_attributes( array( $colour_attr, $size_attr ) );
	$product_id = $product->save();

	update_post_meta( $product_id, '_stf_slogan', $item['slogan'] );
	update_post_meta( $product_id, '_stf_number', $number );
	wp_set_object_terms( $product_id, $item['cats'], 'product_cat' );

	// Rebuild the variation set rather than trying to reconcile it.
	foreach ( $product->get_children() as $child_id ) {
		wp_delete_post( $child_id, true );
	}

	foreach ( array_keys( $colour['terms'] ) as $colour_slug ) {
		foreach ( array_keys( $size['terms'] ) as $size_slug ) {
			$variation = new WC_Product_Variation();
			$variation->set_parent_id( $product_id );
			$variation->set_attributes( array(
				'pa_color' => $colour_slug,
				'pa_size'  => $size_slug,
			) );
			$variation->set_regular_price( (string) ( $item['price'] + $size_upcharge[ $size_slug ] ) );
			$variation->set_sku( sprintf( 'STF-%s-%s-%s', $number, strtoupper( substr( $colour_slug, 0, 3 ) ), strtoupper( $size_slug ) ) );
			$variation->set_manage_stock( true );
			$variation->set_stock_quantity( 40 );
			$variation->set_backorders( 'no' );

			// One deliberate sold-out combination so the storefront's
			// out-of-stock state is exercised on a real product.
			if ( 0 === $index && 'white' === $colour_slug && '3xl' === $size_slug ) {
				$variation->set_stock_quantity( 0 );
				$variation->set_stock_status( 'outofstock' );
			}

			$variation->save();
		}
	}

	WC_Product_Variable::sync( $product_id );
	$made++;
}

WP_CLI::line( "    {$made} products x 12 variations" );

WP_CLI::line( '  - shipping' );
$threshold = (float) ( getenv( 'FREE_SHIPPING_THRESHOLD' ) ? getenv( 'FREE_SHIPPING_THRESHOLD' ) : 60 );

$zones  = WC_Shipping_Zones::get_zones();
$has_us = false;
foreach ( $zones as $zone_data ) {
	if ( 'United States' === $zone_data['zone_name'] ) {
		$has_us = true;
	}
}

if ( ! $has_us ) {
	$zone = new WC_Shipping_Zone();
	$zone->set_zone_name( 'United States' );
	$zone->add_location( 'US', 'country' );
	$zone->save();

	$flat     = $zone->add_shipping_method( 'flat_rate' );
	$instance = WC_Shipping_Zones::get_shipping_method( $flat );
	$instance->instance_settings['title'] = 'Standard (3-5 business days)';
	$instance->instance_settings['cost']  = '5.95';
	update_option( $instance->get_instance_option_key(), $instance->instance_settings );

	$free     = $zone->add_shipping_method( 'free_shipping' );
	$instance = WC_Shipping_Zones::get_shipping_method( $free );
	$instance->instance_settings['title']      = 'Free shipping';
	$instance->instance_settings['requires']   = 'min_amount';
	$instance->instance_settings['min_amount'] = (string) $threshold;
	update_option( $instance->get_instance_option_key(), $instance->instance_settings );

	// Rest of world.
	$rest = new WC_Shipping_Zone();
	$rest->set_zone_name( 'International' );
	$rest->save();
	$intl     = $rest->add_shipping_method( 'flat_rate' );
	$instance = WC_Shipping_Zones::get_shipping_method( $intl );
	$instance->instance_settings['title'] = 'International (7-14 business days)';
	$instance->instance_settings['cost']  = '16.00';
	update_option( $instance->get_instance_option_key(), $instance->instance_settings );
}

WP_CLI::line( '  - payments' );
// Offline gateways only - real card processing needs live keys. See DEPLOY.md.
foreach ( array( 'cod', 'cheque', 'bacs' ) as $gateway ) {
	$settings            = get_option( "woocommerce_{$gateway}_settings", array() );
	$settings['enabled'] = ( 'cod' === $gateway ) ? 'yes' : 'no';
	update_option( "woocommerce_{$gateway}_settings", $settings );
}

WP_CLI::line( '  - coupon' );
$code = strtolower( getenv( 'EXIT_COUPON' ) ? getenv( 'EXIT_COUPON' ) : 'funny10' );
if ( ! wc_get_coupon_id_by_code( $code ) ) {
	$coupon = new WC_Coupon();
	$coupon->set_code( $code );
	$coupon->set_discount_type( 'percent' );
	$coupon->set_amount( 10 );
	$coupon->set_individual_use( true );
	$coupon->set_usage_limit_per_user( 1 );
	$coupon->set_description( 'Exit-intent popup - first order' );
	$coupon->save();
}

WP_CLI::line( '  - policy pages' );
$pages = array(
	'shipping' => array(
		'Shipping',
		"Orders print and ship within two business days.\n\nStandard US delivery is 3-5 business days and costs \$5.95. It is free over \${$threshold}. International is 7-14 business days at a flat \$16.\n\nYou will get a tracking number by email the moment the parcel is scanned.",
	),
	'returns'  => array(
		'Returns',
		"Wear it, wash it, change your mind - you have 30 days.\n\nSend it back and we will refund the shirt to your original payment method within five business days of it arriving. We are not going to inspect it under a lamp.\n\nWrong size is on us: we pay return shipping and send the right one.\n\nEmail hello@shirtthatsfunny.com to start a return.",
	),
	'sizing'   => array(
		'Sizing',
		"Every shirt is a unisex cut, S through 3XL.\n\nThe fit is true to size with a straight body. If you are between sizes, or you like room, take the next one up.",
	),
	'privacy'  => array(
		'Privacy',
		"We collect what we need to send you a shirt: name, address, email, and your order.\n\nWe do not sell it. We do not share it with anyone except the payment processor and the carrier.\n\nIf you signed up for email you can unsubscribe from any message we send you.",
	),
	'terms'    => array(
		'Terms',
		"Buy a shirt, we send you a shirt.\n\nPrices are in US dollars. Sales tax is added at checkout where we are required to collect it.\n\nThe designs are ours. The joke is arguably everyone's.",
	),
	'about'    => array(
		'About',
		"We print funny shirts in two colours because a third colour is a decision, and decisions are exhausting.\n\nEverything is water-based ink on ring-spun cotton, printed in small runs. When a design stops being funny we stop printing it.",
	),
);

foreach ( $pages as $page_slug => $page ) {
	$existing = get_page_by_path( $page_slug );
	$data     = array(
		'post_title'   => $page[0],
		'post_name'    => $page_slug,
		'post_content' => $page[1],
		'post_status'  => 'publish',
		'post_type'    => 'page',
	);
	if ( $existing ) {
		$data['ID'] = $existing->ID;
		wp_update_post( $data );
	} else {
		wp_insert_post( $data );
	}
}

WP_CLI::line( '  - REST API key' );
/**
 * Woo stores the consumer key as an HMAC and the secret in the clear. Writing
 * the row ourselves means .env is the single source of truth - no copying
 * generated keys out of wp-admin.
 */
global $wpdb;

$key    = getenv( 'WC_CONSUMER_KEY' );
$secret = getenv( 'WC_CONSUMER_SECRET' );
$table  = $wpdb->prefix . 'woocommerce_api_keys';
$user   = get_user_by( 'login', getenv( 'WP_ADMIN_USER' ) );

if ( $key && $secret && $user && 0 === strpos( $key, 'ck_' ) ) {
	$hashed = wc_api_hash( $key );
	$row    = array(
		'user_id'         => $user->ID,
		'description'     => 'Next.js storefront (read-only)',
		'permissions'     => 'read',
		'consumer_key'    => $hashed,
		'consumer_secret' => $secret,
		'truncated_key'   => substr( $key, -7 ),
	);

	$found = $wpdb->get_var( $wpdb->prepare( "SELECT key_id FROM {$table} WHERE consumer_key = %s", $hashed ) );
	if ( $found ) {
		$wpdb->update( $table, $row, array( 'key_id' => $found ) );
	} else {
		$wpdb->insert( $table, $row );
	}
} else {
	WP_CLI::warning( 'WC_CONSUMER_KEY/SECRET missing or malformed - storefront catalogue calls will 401. Set them in .env.' );
}

wc_delete_product_transients();
wp_cache_flush();

WP_CLI::success( 'Store seeded.' );
