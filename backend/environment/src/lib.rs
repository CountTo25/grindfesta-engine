use proc_macro2::TokenStream;
use quote::{quote, ToTokens};
use syn::parse::{Parse, ParseStream};
use syn::{parse_macro_input, Expr, Ident, Item, ItemMod, Result as SynResult, Token, Type};

struct EnvConstDecl {
    env_name: Ident,
    env_type: Type,
    default: Option<Expr>,
}

impl Parse for EnvConstDecl {
    fn parse(input: ParseStream) -> SynResult<Self> {
        input.parse::<Token![const]>()?;
        let env_name = input.parse::<Ident>()?;
        input.parse::<Token![:]>()?;
        let env_type = input.parse::<Type>()?;
        let default = if input.peek(Token![=]) {
            input.parse::<Token![=]>()?;
            Some(input.parse::<Expr>()?)
        } else {
            None
        };
        input.parse::<Token![;]>()?;

        Ok(Self {
            env_name,
            env_type,
            default,
        })
    }
}

#[proc_macro_attribute]
pub fn load(
    _attr: proc_macro::TokenStream,
    item: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let input = parse_macro_input!(item as ItemMod);
    let mod_name = &input.ident;

    let mut lazy_statics = Vec::new();
    let mut inits = Vec::new();

    if let Some((_, items)) = &input.content {
        for item in items {
            let const_item = parse_env_const(item);
            let env_name = &const_item.env_name;
            let env_type = &const_item.env_type;

            let parsed = if is_string_type(env_type) {
                match &const_item.default {
                    Some(default) => quote! {
                        lazy_static! {
                            pub static ref #env_name: #env_type = std::env::var(stringify!(#env_name))
                                .unwrap_or_else(|_| (#default).into());
                        }
                    },
                    None => quote! {
                        lazy_static! {
                            pub static ref #env_name: #env_type = std::env::var(stringify!(#env_name))
                                .expect(&format!("Missing {} env", stringify!(#env_name)));
                        }
                    },
                }
            } else {
                match &const_item.default {
                    Some(default) => quote! {
                        lazy_static! {
                            pub static ref #env_name: #env_type = std::env::var(stringify!(#env_name))
                                .unwrap_or_else(|_| (#default).to_string())
                                .parse::<#env_type>()
                                .expect(&format!("Failed to parse env {} into {}", stringify!(#env_name), stringify!(#env_type)));
                        }
                    },
                    None => quote! {
                        lazy_static! {
                            pub static ref #env_name: #env_type = std::env::var(stringify!(#env_name))
                                .expect(&format!("Missing {} env", stringify!(#env_name)))
                                .parse::<#env_type>()
                                .expect(&format!("Failed to parse env {} into {}", stringify!(#env_name), stringify!(#env_type)));
                        }
                    },
                }
            };

            inits.push(quote!({
                lazy_static::initialize(&#env_name);
            }));
            lazy_statics.push(parsed);
        }
    }

    let expanded = quote! {
        pub mod #mod_name {
            extern crate lazy_static;
            use ::lazy_static::lazy_static;

            pub fn init() {
                #(#inits)*
            }

            #(#lazy_statics)*
        }
    };

    TokenStream::from(expanded).into()
}

fn parse_env_const(item: &Item) -> EnvConstDecl {
    let tokens = match item {
        Item::Verbatim(tokens) => tokens.clone(),
        Item::Const(item_const) => item_const.to_token_stream(),
        _ => panic!("Unexpected mod member"),
    };

    syn::parse2::<EnvConstDecl>(tokens).expect("Failed to parse env const declaration")
}

fn is_string_type(env_type: &Type) -> bool {
    match env_type {
        Type::Path(type_path) => type_path
            .path
            .segments
            .last()
            .map(|segment| segment.ident == "String")
            .unwrap_or(false),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use quote::quote;

    #[test]
    fn parses_const_without_default() {
        let parsed = syn::parse2::<EnvConstDecl>(quote!(
            const DB_ROOT: String;
        ))
        .expect("parse const decl");

        assert_eq!(parsed.env_name.to_string(), "DB_ROOT");
        assert!(is_string_type(&parsed.env_type));
        assert!(parsed.default.is_none());
    }

    #[test]
    fn preserves_full_string_default_expression() {
        let parsed = syn::parse2::<EnvConstDecl>(quote!(
            const PDFER_S3_BUCKET_PATH: String = String::from("s3://onigo-pdfgen/");
        ))
        .expect("parse const decl");

        let default = parsed
            .default
            .expect("default expr")
            .to_token_stream()
            .to_string();
        assert_eq!(default, "String :: from (\"s3://onigo-pdfgen/\")");
    }

    #[test]
    fn preserves_literal_string_default_expression() {
        let parsed = syn::parse2::<EnvConstDecl>(quote!(
            const ENVIRONMENT: String = "dev";
        ))
        .expect("parse const decl");

        let default = parsed
            .default
            .expect("default expr")
            .to_token_stream()
            .to_string();
        assert_eq!(default, "\"dev\"");
    }

    #[test]
    fn preserves_non_string_default_expression() {
        let parsed = syn::parse2::<EnvConstDecl>(quote!(
            const PORT: u16 = 3052;
        ))
        .expect("parse const decl");

        let default = parsed
            .default
            .expect("default expr")
            .to_token_stream()
            .to_string();
        assert_eq!(default, "3052");
        assert!(!is_string_type(&parsed.env_type));
    }
}
