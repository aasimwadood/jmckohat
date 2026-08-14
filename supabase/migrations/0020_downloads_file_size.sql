-- DownloadPage.tsx shows a file size alongside the upload date.
alter table downloads add column file_size_bytes bigint;
