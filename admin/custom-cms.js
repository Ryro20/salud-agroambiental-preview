(function () {
  'use strict';

  function boot() {
    const CMS = window.CMS;
    const h = window.h;
    const createClass = window.createClass;

    if (!CMS || !h || !createClass) {
      console.error('Decap CMS no está disponible.');
      return;
    }

    if (!document.querySelector('link[data-salbi-admin-theme]')) {
      const themeLink = document.createElement('link');

      themeLink.rel = 'stylesheet';
      themeLink.href = './admin.css';
      themeLink.dataset.salbiAdminTheme = 'true';

      document.head.appendChild(themeLink);
    }

    function safeGet(source, key, fallback) {
      if (source == null) {
        return fallback;
      }

      if (typeof source.get === 'function') {
        const value = source.get(key);

        return value == null ? fallback : value;
      }

      if (
        typeof source === 'object' &&
        Object.prototype.hasOwnProperty.call(source, key)
      ) {
        return source[key] == null ? fallback : source[key];
      }

      return fallback;
    }

    function safeGetIn(source, path, fallback) {
      if (source == null) {
        return fallback;
      }

      if (typeof source.getIn === 'function') {
        const value = source.getIn(path);

        return value == null ? fallback : value;
      }

      let current = source;

      for (let i = 0; i < path.length; i += 1) {
        if (current == null) {
          return fallback;
        }

        const key = path[i];

        if (typeof current.get === 'function') {
          current = current.get(key);
        } else if (
          typeof current === 'object' &&
          Object.prototype.hasOwnProperty.call(current, key)
        ) {
          current = current[key];
        } else {
          return fallback;
        }
      }

      return current == null ? fallback : current;
    }

    function toJS(value) {
      if (value == null) {
        return value;
      }

      if (typeof value.toJS === 'function') {
        return value.toJS();
      }

      if (typeof value.toObject === 'function') {
        return value.toObject();
      }

      if (typeof value.toArray === 'function') {
        return value.toArray();
      }

      return value;
    }

    function toArray(value) {
      if (value == null) {
        return [];
      }

      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value.toArray === 'function') {
        return value.toArray();
      }

      if (typeof value.toJS === 'function') {
        const converted = value.toJS();

        return Array.isArray(converted)
          ? converted
          : [];
      }

      return [];
    }

    function stringValue(value, fallback) {
      if (value == null) {
        return fallback || '';
      }

      if (
        typeof value === 'string' ||
        typeof value === 'number'
      ) {
        return String(value);
      }

      return fallback || '';
    }

    function assetUrl(getAsset, value) {
      if (!value) {
        return '';
      }

      try {
        const asset = getAsset(value);

        if (!asset) {
          return String(value);
        }

        return asset.toString();
      } catch (error) {
        return String(value);
      }
    }

    function escapeText(value) {
      return stringValue(value, '');
    }

    function mapAlign(value) {
      return {
        izquierda: 'left',
        centro: 'center',
        derecha: 'right'
      }[value] || 'center';
    }

    function mapPosition(value) {
      return {
        centro: 'center',
        arriba: 'top',
        abajo: 'bottom',
        izquierda: 'left',
        derecha: 'right'
      }[value] || 'center';
    }

    function mapSpacer(value) {
      return {
        pequeño: 'small',
        medio: 'medium',
        grande: 'large'
      }[value] || 'medium';
    }

    function getWidget(widgetContainer, name) {
      if (widgetContainer == null) {
        return null;
      }

      if (typeof widgetContainer.get === 'function') {
        return widgetContainer.get(name) || null;
      }

      if (
        typeof widgetContainer === 'object' &&
        Object.prototype.hasOwnProperty.call(widgetContainer, name)
      ) {
        return widgetContainer[name] || null;
      }

      return null;
    }

    function getBlockRecordValue(block, key, fallback) {
      return safeGetIn(
        block,
        ['data', key],
        fallback
      );
    }

    function PercentageControl(props) {
      const value = Number(
        props.value == null
          ? 100
          : props.value
      );

      return h(
        'div',
        {
          className: 'salbi-percentage-control'
        },

        h(
          'div',
          {
            className: 'salbi-percentage-control__row'
          },

          h(
            'input',
            {
              id: props.forID,
              type: 'range',
              min: 25,
              max: 100,
              step: 5,
              value: value,

              onChange: function (event) {
                props.onChange(
                  Number(event.target.value)
                );
              }
            }
          ),

          h(
            'output',
            {
              className: 'salbi-percentage-control__value'
            },
            value + '%'
          )
        ),

        h(
          'small',
          {
            className: 'salbi-percentage-control__hint'
          },
          '25% = compacta · 100% = ancho completo'
        )
      );
    }

    function PercentagePreview(props) {
      return h(
        'span',
        {
          className: 'salbi-percentage-preview'
        },
        Number(
          props.value == null
            ? 100
            : props.value
        ) + '%'
      );
    }

    CMS.registerWidget(
      'salbi-percentage',
      createClass({
        render: function () {
          return PercentageControl(this.props);
        }
      }),
      createClass({
        render: function () {
          return PercentagePreview(this.props);
        }
      }),
      {
        properties: {
          min: { type: 'number' },
          max: { type: 'number' },
          step: { type: 'number' }
        }
      }
    );

    CMS.registerPreviewStyle(
      '/assets/css/variables.css'
    );

    CMS.registerPreviewStyle(
      '/assets/css/global.css'
    );

    CMS.registerPreviewStyle(
      '/assets/css/pages/post.css'
    );

    CMS.registerPreviewStyle(
      '/admin/preview.css'
    );

    const PostPreview = createClass({

      render: function () {
        const entry = this.props.entry;
        const getAsset = this.props.getAsset;
        const widgetsFor = this.props.widgetsFor;

        if (!entry) {
          return h(
            'div',
            {
              className: 'post-preview-empty'
            },
            'No hay contenido para previsualizar.'
          );
        }

        const data = safeGet(
          entry,
          'data',
          {}
        );

        const title = escapeText(
          safeGet(data, 'title', 'Título de la entrada')
        );

        const excerpt = escapeText(
          safeGet(data, 'excerpt', '')
        );

        const author = escapeText(
          safeGet(
            data,
            'author',
            'Salud Agroambiental'
          )
        );

        const date = safeGet(
          data,
          'date',
          ''
        );

        const image = safeGet(
          data,
          'image',
          ''
        );

        const imageAlt = escapeText(
          safeGet(
            data,
            'image_alt',
            title
          )
        );

        const coverWidth = Number(
          safeGet(
            data,
            'image_width',
            100
          ) || 100
        );

        const showShare =
          safeGet(
            data,
            'show_share',
            true
          ) !== false;

        const showComments =
          safeGet(
            data,
            'show_comments',
            true
          ) !== false;

        const categories = toArray(
          safeGet(
            data,
            'categories',
            []
          )
        );

        const category = escapeText(
          categories.length
            ? categories[0]
            : 'Actualidad'
        );

        let blocks = [];

        if (typeof widgetsFor === 'function') {
          try {
            blocks = widgetsFor('blocks');

            if (!Array.isArray(blocks)) {
              blocks = toArray(blocks);
            }
          } catch (error) {
            console.error(
              'Error leyendo los bloques:',
              error
            );

            blocks = [];
          }
        }

        const renderedBlocks = blocks
          .map(function (block, index) {

            const type = escapeText(
              safeGetIn(
                block,
                ['data', 'type'],
                safeGetIn(
                  block,
                  ['data', '_type'],
                  ''
                )
              )
            );

            const widgets =
              safeGet(
                block,
                'widgets',
                null
              );

            const key =
              'salbi-block-' + index;

            if (type === 'rich-text') {
              return h(
                'div',
                {
                  className:
                    'post-block post-rich-text',
                  key: key
                },
                getWidget(
                  widgets,
                  'content'
                )
              );
            }

            if (type === 'heading') {
              const level = escapeText(
                getBlockRecordValue(
                  block,
                  'level',
                  'H2'
                )
              );

              const text = escapeText(
                getBlockRecordValue(
                  block,
                  'text',
                  ''
                )
              );

              const Tag =
                level === 'H4'
                  ? 'h4'
                  : level === 'H3'
                    ? 'h3'
                    : 'h2';

              return h(
                Tag,
                {
                  className:
                    'post-block',
                  key: key
                },
                text
              );
            }

            if (type === 'image') {
              const src = assetUrl(
                getAsset,
                getBlockRecordValue(
                  block,
                  'image',
                  ''
                )
              );

              const alt = escapeText(
                getBlockRecordValue(
                  block,
                  'alt',
                  ''
                )
              );

              const caption = escapeText(
                getBlockRecordValue(
                  block,
                  'caption',
                  ''
                )
              );

              const width = Number(
                getBlockRecordValue(
                  block,
                  'width',
                  getBlockRecordValue(
                    block,
                    'image_width',
                    100
                  )
                ) || 100
              );

              const height =
                getBlockRecordValue(
                  block,
                  'height',
                  'auto'
                );

              const fit = escapeText(
                getBlockRecordValue(
                  block,
                  'fit',
                  'contain'
                )
              );

              const align = escapeText(
                getBlockRecordValue(
                  block,
                  'align',
                  'centro'
                )
              );

              return h(
                'figure',
                {
                  className:
                    'post-block post-media post-media--' +
                    align,
                  key: key
                },

                src
                  ? h(
                      'img',
                      {
                        src: src,
                        alt: alt,
                        loading: 'lazy',

                        style: {
                          width: Math.min(
                            Math.max(
                              width,
                              25
                            ),
                            100
                          ) + '%',

                          height:
                            height &&
                            height !== 'auto'
                              ? height
                              : 'auto',

                          objectFit:
                            fit,

                          display:
                            'block',

                          marginLeft:
                            align === 'izquierda'
                              ? '0'
                              : 'auto',

                          marginRight:
                            align === 'derecha'
                              ? '0'
                              : 'auto'
                        }
                      }
                    )
                  : h(
                      'div',
                      {
                        className:
                          'post-image-placeholder'
                      },
                      'Imagen sin seleccionar'
                    ),

                caption
                  ? h(
                      'figcaption',
                      {},
                      caption
                    )
                  : null
              );
            }

            if (type === 'gallery') {

              const galleryTitle =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'title',
                    ''
                  )
                );

              const columns = escapeText(
                getBlockRecordValue(
                  block,
                  'columns',
                  '3'
                )
              );

              let images =
                getBlockRecordValue(
                  block,
                  'images',
                  []
                );

              images = toArray(images);

              const galleryItems =
                images.map(
                  function (item, itemIndex) {

                    const itemImage =
                      safeGet(
                        item,
                        'image',
                        ''
                      );

                    const itemAlt =
                      escapeText(
                        safeGet(
                          item,
                          'alt',
                          ''
                        )
                      );

                    const itemCaption =
                      escapeText(
                        safeGet(
                          item,
                          'caption',
                          ''
                        )
                      );

                    const itemFit =
                      escapeText(
                        safeGet(
                          item,
                          'fit',
                          'cover'
                        )
                      );

                    const itemPosition =
                      mapPosition(
                        safeGet(
                          item,
                          'position',
                          'centro'
                        )
                      );

                    return h(
                      'figure',
                      {
                        className:
                          'post-gallery-item',
                        key:
                          key +
                          '-gallery-' +
                          itemIndex
                      },

                      itemImage
                        ? h(
                            'img',
                            {
                              src:
                                assetUrl(
                                  getAsset,
                                  itemImage
                                ),

                              alt:
                                itemAlt,

                              loading:
                                'lazy',

                              style: {
                                objectFit:
                                  itemFit,

                                objectPosition:
                                  itemPosition
                              }
                            }
                          )
                        : null,

                      itemCaption
                        ? h(
                            'figcaption',
                            {},
                            itemCaption
                          )
                        : null
                    );
                  }
                );

              return h(
                'section',
                {
                  className:
                    'post-block post-gallery-block',
                  key: key
                },

                galleryTitle
                  ? h(
                      'h3',
                      {},
                      galleryTitle
                    )
                  : null,

                h(
                  'div',
                  {
                    className:
                      'post-gallery post-gallery--' +
                      columns
                  },
                  galleryItems
                )
              );
            }

            if (type === 'media-text') {

              const src = assetUrl(
                getAsset,
                getBlockRecordValue(
                  block,
                  'image',
                  ''
                )
              );

              const alt = escapeText(
                getBlockRecordValue(
                  block,
                  'alt',
                  ''
                )
              );

              const mediaTitle =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'title',
                    ''
                  )
                );

              const position =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'position',
                    'izquierda'
                  )
                );

              const imageWidth =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'image_width',
                    '50%'
                  )
                );

              return h(
                'section',
                {
                  className:
                    'post-block post-media-text post-media-text--' +
                    position,
                  key: key
                },

                h(
                  'div',
                  {
                    className:
                      'post-media-text__media',

                    style: {
                      width: imageWidth
                    }
                  },

                  src
                    ? h(
                        'img',
                        {
                          src: src,
                          alt: alt,
                          loading: 'lazy'
                        }
                      )
                    : null
                ),

                h(
                  'div',
                  {
                    className:
                      'post-media-text__copy'
                  },

                  mediaTitle
                    ? h(
                        'h3',
                        {},
                        mediaTitle
                      )
                    : null,

                  getWidget(
                    widgets,
                    'content'
                  )
                )
              );
            }

            if (type === 'quote') {

              const quoteText =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'text',
                    ''
                  )
                );

              const quoteAuthor =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'author',
                    ''
                  )
                );

              return h(
                'figure',
                {
                  className:
                    'post-block post-quote',
                  key: key
                },

                h(
                  'blockquote',
                  {},
                  quoteText
                ),

                quoteAuthor
                  ? h(
                      'figcaption',
                      {},
                      '— ' + quoteAuthor
                    )
                  : null
              );
            }

            if (type === 'callout') {

              const calloutTitle =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'title',
                    ''
                  )
                );

              const tone =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'tone',
                    'informacion'
                  )
                );

              return h(
                'aside',
                {
                  className:
                    'post-block post-callout post-callout--' +
                    tone,
                  key: key
                },

                calloutTitle
                  ? h(
                      'h3',
                      {},
                      calloutTitle
                    )
                  : null,

                getWidget(
                  widgets,
                  'content'
                )
              );
            }

            if (type === 'button') {

              const label =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'label',
                    'Abrir enlace'
                  )
                );

              const url =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'url',
                    '#'
                  )
                );

              return h(
                'div',
                {
                  className:
                    'post-block post-action',
                  key: key
                },

                h(
                  'a',
                  {
                    className:
                      'btn btn-primary',

                    href: url,

                    onClick:
                      function (event) {
                        event.preventDefault();
                      }
                  },
                  label
                )
              );
            }

            if (type === 'divider') {

              const style =
                escapeText(
                  getBlockRecordValue(
                    block,
                    'style',
                    'línea'
                  )
                );

              if (style === 'espacio') {
                return h(
                  'div',
                  {
                    className:
                      'post-block post-spacer post-spacer--medium',
                    key: key
                  }
                );
              }

              return h(
                'hr',
                {
                  className:
                    'post-block post-divider',
                  key: key
                }
              );
            }

            if (type === 'spacer') {

              const size =
                getBlockRecordValue(
                  block,
                  'size',
                  'medio'
                );

              return h(
                'div',
                {
                  className:
                    'post-block post-spacer post-spacer--' +
                    mapSpacer(size),
                  key: key
                }
              );
            }

            return null;
          })
          .filter(Boolean);

        let formattedDate = '';

        if (date) {
          try {
            formattedDate =
              new Date(
                String(date)
              ).toLocaleDateString(
                'es-ES',
                {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }
              );
          } catch (error) {
            formattedDate =
              String(date);
          }
        }

        const siteHeader = h(
          'header',
          {
            className:
              'site-header post-preview-site-header'
          },

          h(
            'div',
            {
              className:
                'wrap header-inner'
            },

            h(
              'div',
              {
                className:
                  'site-brand'
              },

              h(
                'img',
                {
                  src:
                    '/assets/img/logo.png',

                  alt:
                    'Salud Agroambiental',

                  className:
                    'post-preview-brand-placeholder'
                }
              ),

              h(
                'span',
                {
                  className:
                    'brand-copy'
                },

                h(
                  'strong',
                  {},
                  'Salud Agroambiental'
                ),

                h(
                  'small',
                  {},
                  'Salud · Agro · Ambiente'
                )
              )
            ),

            h(
              'span',
              {
                className:
                  'post-preview-shell-label'
              },
              'Vista previa'
            )
          )
        );

        const siteFooter = h(
          'footer',
          {
            className:
              'site-footer post-preview-site-footer'
          },

          h(
            'div',
            {
              className: 'wrap'
            },

            h(
              'div',
              {
                className:
                  'footer-bottom'
              },

              h(
                'p',
                {},
                '© Salud Agroambiental'
              ),

              h(
                'p',
                {},
                'Vista previa editorial'
              )
            )
          )
        );

        return h(
          'div',
          {
            className:
              'post-preview-shell'
          },

          siteHeader,

          h(
            'article',
            {
              className:
                'post-preview post',

              itemScope: true,

              itemType:
                'https://schema.org/BlogPosting'
            },

            h(
              'div',
              {
                className:
                  'wrap post-wrap'
              },

              h(
                'div',
                {
                  className:
                    'post-preview-note'
                },
                'Esta vista intenta reproducir la estructura visual de la entrada publicada.'
              ),

              h(
                'header',
                {
                  className:
                    'post-header'
                },

                h(
                  'p',
                  {
                    className:
                      'post-kicker'
                  },
                  'Salud Agroambiental · ' +
                    category
                ),

                h(
                  'h1',
                  {
                    itemProp:
                      'headline'
                  },
                  title ||
                    'Título de la entrada'
                ),

                excerpt
                  ? h(
                      'p',
                      {
                        className:
                          'post-deck',

                        itemProp:
                          'description'
                      },
                      excerpt
                    )
                  : null,

                h(
                  'div',
                  {
                    className:
                      'post-meta'
                  },

                  formattedDate
                    ? h(
                        'time',
                        {},
                        formattedDate
                      )
                    : null,

                  h(
                    'span',
                    {},
                    author
                  )
                )
              ),

              image
                ? h(
                    'figure',
                    {
                      className:
                        'post-cover',

                      style: {
                        width:
                          Math.min(
                            Math.max(
                              coverWidth,
                              25
                            ),
                            100
                          ) + '%'
                      }
                    },

                    h(
                      'img',
                      {
                        className:
                          'post-image',

                        src:
                          assetUrl(
                            getAsset,
                            image
                          ),

                        alt:
                          imageAlt,

                        loading:
                          'eager'
                      }
                    )
                  )
                : null,

              h(
                'div',
                {
                  className:
                    'post-body-grid'
                },

                h(
                  'aside',
                  {
                    className:
                      'post-side',

                    'aria-hidden':
                      'true'
                  },

                  h(
                    'strong',
                    {},
                    'SALBI'
                  ),

                  h(
                    'span',
                    {},
                    category
                  )
                ),

                h(
                  'div',
                  {
                    className:
                      'post-content',

                    itemProp:
                      'articleBody'
                  },

                  renderedBlocks.length
                    ? renderedBlocks
                    : h(
                        'p',
                        {
                          className:
                            'post-preview-empty'
                        },
                        'Añade bloques de contenido para verlos aquí.'
                      )
                )
              ),

              showShare
                ? h(
                    'section',
                    {
                      className:
                        'share-buttons post-preview-placeholder'
                    },

                    h(
                      'span',
                      {},
                      'Compartir'
                    ),

                    h(
                      'a',
                      {
                        href: '#',
                        onClick:
                          function (event) {
                            event.preventDefault();
                          }
                      },
                      'Facebook'
                    ),

                    h(
                      'a',
                      {
                        href: '#',
                        onClick:
                          function (event) {
                            event.preventDefault();
                          }
                      },
                      'WhatsApp'
                    ),

                    h(
                      'a',
                      {
                        href: '#',
                        onClick:
                          function (event) {
                            event.preventDefault();
                          }
                      },
                      'Copiar enlace'
                    )
                  )
                : null,

              showComments
                ? h(
                    'section',
                    {
                      className:
                        'comments post-preview-placeholder'
                    },

                    h(
                      'h2',
                      {},
                      'Comentarios'
                    ),

                    h(
                      'p',
                      {},
                      'Giscus aparecerá aquí en la publicación real.'
                    )
                  )
                : null
            )
          ),

          siteFooter
        );
      }
    });

    CMS.registerPreviewTemplate(
      'posts',
      PostPreview
    );

    const helpButton =
      document.querySelector(
        '[data-admin-help]'
      );

    const dialog =
      document.querySelector(
        '[data-admin-dialog]'
      );

    const closeButtons =
      document.querySelectorAll(
        '[data-admin-close]'
      );

    if (
      helpButton &&
      dialog
    ) {
      helpButton.addEventListener(
        'click',
        function () {
          if (
            typeof dialog.showModal ===
            'function'
          ) {
            dialog.showModal();
          }
        }
      );

      closeButtons.forEach(
        function (button) {
          button.addEventListener(
            'click',
            function () {
              if (
                typeof dialog.close ===
                'function'
              ) {
                dialog.close();
              }
            }
          );
        }
      );

      dialog.addEventListener(
        'click',
        function (event) {
          if (
            event.target === dialog &&
            typeof dialog.close ===
              'function'
          ) {
            dialog.close();
          }
        }
      );
    }

    CMS.init();
    console.log('Decap CMS inicializado de forma segura.');
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot
    );
  } else {
    boot();
  }
})();