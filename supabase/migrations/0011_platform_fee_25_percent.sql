-- Set the platform's commission to a fixed 25%.
update platform_settings set value = '25' where key = 'fee_percentage';
