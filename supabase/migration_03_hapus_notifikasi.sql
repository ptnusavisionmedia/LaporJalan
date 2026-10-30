-- Menghapus fitur notifikasi. Aman dijalankan walau migration notifikasi tidak pernah dipakai.
drop trigger if exists reports_notify_status on public.reports;
drop trigger if exists updates_notify_photo on public.report_updates;
drop function if exists public.notify_status_change();
drop function if exists public.notify_after_photo();
drop function if exists public.guard_notification_update();
drop table if exists public.notifications cascade;
drop table if exists public.push_tokens cascade;