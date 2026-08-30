SELECT id, project_uuid, name, source_url, css_content, prefix, style_class, icons
FROM icon_libraries
WHERE project_uuid = ?1
ORDER BY created_at, id;
