-- Filet de sécurité au niveau du bucket lui-même (en plus des vérifications
-- applicatives) : 25 Mo, cohérent avec MAX_UPLOAD_FILE_SIZE_BYTES.
update storage.buckets set file_size_limit = 26214400 where id = 'documents';
