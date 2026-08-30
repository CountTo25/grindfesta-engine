INSERT INTO icon_libraries (
    project_uuid,
    name,
    source_url,
    css_content,
    prefix,
    style_class,
    icons
)
VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
RETURNING id, project_uuid, name, source_url, css_content, prefix, style_class, icons;
