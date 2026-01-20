/**
 * Test fixtures for LeboncoinStrategy
 *
 * These fixtures contain real HTML captured from leboncoin.fr for deterministic testing.
 * Style tags and inline styles have been stripped for cleaner storage.
 */

/**
 * Real HTML from a Leboncoin job listing card (captured from live site)
 * This listing is from the "Emploi" category (category=71)
 */
export const leboncoinJobListingHtml = `<article data-test-id="ad" data-qa-id="aditem_container" class="relative h-[inherit] group/adcard" aria-label="Mécanicien Automobile (H/F/X)">
  <h3>Mécanicien Automobile (H/F/X)</h3>
  <a class="absolute inset-0" aria-label="Voir l'annonce" href="/ad/offres_d_emploi/3086374270">
    <span aria-hidden="true" class="absolute inset-0 opacity-0" title="Voir l'annonce: Mécanicien Automobile (H/F/X)">Mécanicien Automobile (H/F/X)</span>
  </a>
  <div class="flex h-[inherit] flex-col styles_linkContentPointerEvents__xs5Op">
    <div class="p-lg relative h-[inherit] rounded-md before:z-raised before:border-sm before:pointer-events-none before:absolute before:inset-0 before:rounded-md before:border-solid before:border-outline" data-test-id="adcard-jobs">
      <div class="relative flex h-full flex-col">
        <div class="flex h-full flex-col justify-between">
          <div class="gap-y-sm flex min-w-0 flex-col">
            <div class="gap-x-md flex flex-wrap items-center mb-sm">
              <div data-spark-component="tag" class="box-border default:inline-flex default:w-fit items-center justify-center gap-sm whitespace-nowrap text-caption font-bold px-md h-sz-20 rounded-full bg-accent text-on-accent" aria-hidden="true">À la une</div>
              <p class="sr-only">Annonce à la une.</p>
            </div>
            <p data-test-id="adcard-title" class="text-body-1 text-on-surface line-clamp-(--line-clamp) font-bold break-words text-ellipsis group-hover/adcard:text-main-variant transition-colors duration-300 ease-in-out">Mécanicien Automobile (H/F/X)</p>
            <div class="text-body-2 flex flex-wrap items-baseline">
              <p>CDI</p>
              <p class="text-callout text-on-surface leading-sz-20! flex flex-wrap items-center font-bold font-regular before:mx-sm before:inline-block before:font-bold before:content-['·'] first:before:hidden before:text-neutral" data-test-id="price" aria-hidden="true">
                <span class="">2 400&nbsp;€<small> / mois</small></span>
              </p>
              <p class="sr-only">Prix: 2 400&nbsp;€ brut par mois.</p>
            </div>
            <div class="gap-x-md flex flex-wrap items-center my-sm">
              <div data-spark-component="tag" class="box-border default:inline-flex default:w-fit items-center justify-center gap-sm whitespace-nowrap text-caption font-bold px-md h-sz-20 rounded-full bg-main-container text-on-main-container" aria-hidden="false">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-title="SvgLightningOutline" fill="currentColor" class="fill-current shrink-0 text-current u-current-font-size" data-spark-component="icon" aria-hidden="true" focusable="false">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M13.1975 2.55618C14.0533 1.42281 15.8275 2.15151 15.6765 3.57438L15.1338 8.69058H18.6095C19.7618 8.69058 20.4123 10.0417 19.7086 10.9735L11.8025 21.4438C10.9467 22.5772 9.17254 21.8485 9.32349 20.4256L9.86622 15.3094H6.39051C5.2382 15.3094 4.58773 13.9583 5.29139 13.0265L13.1975 2.55618ZM13.5099 5.41943L7.55291 13.3084H10.503C11.3287 13.3084 11.9718 14.0401 11.8829 14.8784L11.4901 18.5806L17.4471 10.6916H14.497C13.6713 10.6916 13.0282 9.95989 13.1171 9.12156L13.5099 5.41943Z"></path>
                </svg>
                Candidature simplifiée
              </div>
            </div>
            <p class="text-caption text-neutral mt-sm" aria-hidden="true">Montlhéry 91310</p>
            <p class="sr-only">Située à Montlhéry 91310.</p>
            <div class="flex">
              <p class="styles_shine__zBDIo styles_shineAnimation__u8OAw text-caption font-bold before:mx-sm before:inline-block before:font-bold before:content-['·'] first:before:hidden before:text-success" aria-hidden="true">Nouveau !</p>
              <p class="sr-only">Nouveau - Nouvelle annonce.</p>
            </div>
          </div>
          <div class="mt-md gap-md flex items-end justify-between">
            <div class="flex min-w-0 items-center">
              <div class="h-3xl min-w-sz-40 border-sm border-outline relative box-content flex w-3xl items-center justify-center overflow-hidden rounded-md border-solid">
                <img loading="eager" src="https://img.leboncoin.fr/api/v1/lbcpb1/images/a2/a7/f2/a2a7f2f8894105e3a6096f3646ffb36e52490bb1.jpg?rule=ad-image" alt="" class="absolute inset-0 m-auto object-contain">
              </div>
              <span class="ml-md text-body-2 text-on-surface truncate" aria-hidden="true">STAND 14</span>
              <span class="sr-only">Société: STAND 14.</span>
            </div>
            <div class="ml-auto">
              <div data-spark-component="popover-anchor">
                <button data-spark-component="icon-button" type="button" class="u-shadow-border-transition box-border inline-flex items-center justify-center gap-md whitespace-nowrap default:px-lg text-body-1 font-bold focus-visible:u-outline min-w-sz-32 h-sz-32 rounded-full cursor-pointer text-on-support-container bg-surface hover:bg-support-container-hovered enabled:active:bg-support-container-hovered focus-visible:bg-support-container-hovered pl-0 pr-0 text-body-1" aria-busy="false" aria-live="off" data-test-id="adcard_favorite_button" data-qa-id="listitem_save_ad" aria-label="Ajouter l'annonce aux favoris" title="Ajouter l'annonce aux favoris" aria-pressed="false">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-title="SvgHeartOutline" fill="currentColor" class="fill-current shrink-0 text-neutral w-sz-16 h-sz-16" data-spark-component="icon" aria-hidden="true" focusable="false">
                    <path d="M16.2833 3C14.5667 3 13.0417 3.82703 12 5.10675C10.9583 3.82703 9.43333 3 7.71667 3C4.50833 3 2 5.84672 2 9.24189C2 12.0103 3.40833 13.9951 3.975 14.7525C5.84167 17.2249 8.35 18.8615 10.6417 20.3502H10.6583C10.9083 20.5243 11.15 20.681 11.3917 20.8377C11.7167 21.0466 12.1167 21.0553 12.45 20.8551C12.6583 20.7245 12.875 20.5939 13.0833 20.4634H13.1C15.4917 18.9834 18.1167 17.3642 20.05 14.7786C20.6917 13.9168 22 11.9493 22 9.24189C22 5.84672 19.4917 3.00871 16.2833 3.00871V3ZM7.71667 5.11545C9.175 5.11545 10.475 6.07306 11.0667 7.50948C11.225 7.89253 11.5917 8.14499 11.9917 8.14499C12.3917 8.14499 12.7583 7.89253 12.9167 7.50948C13.5167 6.07306 14.8167 5.11545 16.275 5.11545C18.2667 5.11545 19.975 6.9088 19.9667 9.24189C19.9667 11.2442 18.9917 12.7415 18.4417 13.4815C16.7667 15.7362 14.4583 17.1552 12.0083 18.67L11.9333 18.7135L11.725 18.583C9.39167 17.0595 7.18333 15.6144 5.55 13.4467C5.04167 12.7763 4.00833 11.2703 4.00833 9.2506C4.00833 6.9175 5.70833 5.12416 7.70833 5.12416L7.71667 5.11545Z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</article>`;

/**
 * Expected extraction results from the job listing fixture
 */
export const leboncoinJobListingExpected = {
  title: 'Mécanicien Automobile (H/F/X)',
  price: '2 400 € / mois',
  location: 'Montlhéry 91310',
  url: 'https://www.leboncoin.fr/ad/offres_d_emploi/3086374270',
  imageUrl: 'https://img.leboncoin.fr/api/v1/lbcpb1/images/a2/a7/f2/a2a7f2f8894105e3a6096f3646ffb36e52490bb1.jpg?rule=ad-image',
  externalCategory: 'Emploi',
};

/**
 * Minimal listing HTML for testing raw HTML extraction (with style tag to verify stripping)
 */
export const leboncoinListingWithStyleHtml = `<article data-test-id="ad" data-qa-id="aditem_container">
  <style>.test-style { color: red; }</style>
  <h3>Test Title</h3>
  <a href="/ad/test/123">Link</a>
  <p data-test-id="adcard-title" style="color: blue;">Test Title</p>
  <p data-test-id="price">100 €</p>
  <p class="text-caption text-neutral">Paris 75001</p>
  <div data-test-id="adcard-jobs"></div>
</article>`;

/**
 * Page context for extracting category
 */
export const leboncoinPageContext = {
  h1Text: 'Annonces Emploi : Ile-de-France',
  title: 'Emploi Ile-de-France - leboncoin',
  url: 'https://www.leboncoin.fr/recherche?category=71&locations=r_12',
  expectedCategory: 'Emploi',
};

/**
 * Category ID to name mapping (partial - common categories)
 */
export const leboncoinCategoryMap: Record<string, string> = {
  '71': 'Emploi',
  '2': 'Véhicules',
  '9': 'Immobilier',
  '10': 'Multimédia',
  '12': 'Maison',
  '15': 'Loisirs',
  '17': 'Matériel professionnel',
  '27': 'Mode',
};

/**
 * Real estate listing HTML with save ad button containing SVG heart icon
 */
export const leboncoinRealEstateListingHtml = `<article data-test-id="ad" data-qa-id="aditem_container" class="relative">
  <h3>Appartement, 3 pièces</h3>
  <div class="content">
    <p data-test-id="price">725 000 €</p>
    <p class="text-caption text-neutral">Paris 75002</p>
    <div class="carousel">
      <button data-spark-component="carousel-prev-button" type="button">
        <svg viewBox="0 0 24 24" data-title="ArrowVerticalLeft" fill="currentColor"><path d="M16.7,2.28"></path></svg>
      </button>
      <button data-spark-component="carousel-next-button" type="button">
        <svg viewBox="0 0 24 24" data-title="ArrowVerticalRight" fill="currentColor"><path d="M7.3,2.28"></path></svg>
      </button>
    </div>
    <div class="criteria">
      <svg viewBox="0 0 24 24" data-title="SvgLastFloorCriteria" fill="currentColor"><path d="M16.3884"></path></svg>
      <svg viewBox="0 0 24 24" data-title="SvgCaveCriteria" fill="currentColor"><path d="M11.8436"></path></svg>
    </div>
    <div class="favorite">
      <button data-spark-component="icon-button" type="button" data-test-id="adcard_favorite_button" data-qa-id="listitem_save_ad" aria-label="Ajouter l'annonce aux favoris">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-title="SvgHeartOutline" fill="currentColor">
          <path d="M16.2833 3C14.5667"></path>
        </svg>
        <span role="status">Annonce retirée des favoris</span>
      </button>
    </div>
    <img data-test-id="pro-store-logo" src="logo.png" alt="Pro Store">
  </div>
</article>`;

// ============================================================================
// AutoScout24 Test Fixtures
// ============================================================================

/**
 * Test fixtures for AutoScout24Strategy
 *
 * These fixtures contain HTML patterns from autoscout24.fr for deterministic testing.
 */

/**
 * Real HTML from an AutoScout24 dealer listing card
 */
export const autoscout24DealerListingHtml = `<article data-testid="decluttered-list-item" class="list-page-item">
  <style>.ListItemTitle_heading__G2W_N { font-size: 16px; }</style>
  <div class="ListItem_wrapper__TxHWu">
    <a class="ListItemTitle_anchor__4TrfR" href="/voiture/ferrari-roma/ferrari-roma-3-9-v8-biturbo-620-dct-noir-occasion-fr-23b4f5">
      <h2 class="ListItemTitle_heading__G2W_N">Ferrari Roma 3.9 V8 Biturbo 620 DCT</h2>
    </a>
    <div class="ListItemPrice_container__DWNWE">
      <p class="CurrentPrice_price__Ekflz">289 900 €</p>
    </div>
    <div class="ListItemSpecs_container__3M2B5">
      <span>01/2021</span>
      <span>22 500 km</span>
      <span>456 kW (620 ch)</span>
      <span>Essence</span>
    </div>
    <div class="ListItemSeller_container__c8wDH" data-testid="dealer-address">
      <span class="ListItemSeller_address__Fqhiu">FR-75008 Paris</span>
      <span class="ListItemSeller_name__xH5RZ">Luxury Cars Paris</span>
    </div>
    <picture>
      <img data-testid="decluttered-list-item-image" src="https://prod.pictures.autoscout24.net/listing-images/ferrari-roma-123.jpg" alt="Ferrari Roma"/>
    </picture>
    <button data-testid="watchlist-add-button" class="WatchlistButton_button__abc">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32"></path></svg>
    </button>
  </div>
</article>`;

/**
 * Real HTML from an AutoScout24 private seller listing card
 */
export const autoscout24PrivateListingHtml = `<article data-testid="decluttered-list-item" class="list-page-item">
  <div class="ListItem_wrapper__TxHWu">
    <a class="ListItemTitle_anchor__4TrfR" href="/voiture/ferrari-roma/ferrari-roma-2020-occasion-fr-abc123">
      <h2 class="ListItemTitle_heading__G2W_N">Ferrari Roma 2020</h2>
    </a>
    <div class="ListItemPrice_container__DWNWE">
      <p class="CurrentPrice_price__Ekflz">275 000 €</p>
    </div>
    <div class="ListItemSpecs_container__3M2B5">
      <span>06/2020</span>
      <span>15 000 km</span>
      <span>456 kW (620 ch)</span>
      <span>Essence</span>
    </div>
    <div class="ListItemSeller_container__c8wDH">
      <span class="ListItemSeller_address__Fqhiu">FR-69001 Lyon</span>
      <span class="ListItemSeller_type__xyz">Particulier</span>
    </div>
    <picture>
      <img data-testid="decluttered-list-item-image" src="https://prod.pictures.autoscout24.net/listing-images/ferrari-roma-456.jpg" alt="Ferrari Roma"/>
    </picture>
  </div>
</article>`;

/**
 * Expected extraction results from the dealer listing fixture
 */
export const autoscout24DealerListingExpected = {
  title: 'Ferrari Roma 3.9 V8 Biturbo 620 DCT',
  price: '289 900 €',
  location: 'FR-75008 Paris',
  url: 'https://www.autoscout24.fr/voiture/ferrari-roma/ferrari-roma-3-9-v8-biturbo-620-dct-noir-occasion-fr-23b4f5',
  imageUrl: 'https://prod.pictures.autoscout24.net/listing-images/ferrari-roma-123.jpg',
  externalCategory: 'Ferrari Roma',
};

/**
 * Page context for extracting category from AutoScout24
 */
export const autoscout24PageContext = {
  h1Text: '50 offres pour Ferrari Roma',
  title: 'Ferrari Roma occasion - France | AutoScout24',
  url: 'https://www.autoscout24.fr/lst/ferrari/roma?cy=F',
  expectedCategory: 'Ferrari Roma',
};

/**
 * AutoScout24 h1 format variations
 */
export const autoscout24H1Variations = [
  { h1: '50 offres pour Ferrari Roma', expected: 'Ferrari Roma' },
  { h1: '125 offres pour Porsche 911', expected: 'Porsche 911' },
  { h1: '1 offre pour BMW M3', expected: 'BMW M3' },
  { h1: '1.234 offres pour Mercedes-Benz Classe A', expected: 'Mercedes-Benz Classe A' },
  { h1: 'Résultats de recherche', expected: '' },
  { h1: '', expected: '' },
];
