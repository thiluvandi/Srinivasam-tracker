-- Both buckets are private. All access — upload, signed-URL generation,
-- delete — happens server-side via the service-role key, which bypasses
-- storage RLS entirely, so no storage.objects policies are needed.
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('tenant-documents', 'tenant-documents', false)
on conflict (id) do nothing;
